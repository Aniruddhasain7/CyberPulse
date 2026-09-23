from flask import Blueprint, jsonify, request
from sqlalchemy import func, case
from pathlib import Path

from database.connection import db
from models import (
    Alert,
    AttackType,
    TrafficFlow,
    MonitoringSession,
    BlockedIp,
    WhitelistIp,
    SystemSettings,
    get_or_create_settings,
)
from config import Config
from capture.packet_capture import get_capture_status
from detection.engine import get_model_status

system_bp = Blueprint("system", __name__, url_prefix="/api/system")

@system_bp.get("/dashboard")
def dashboard():
    traffic_stats = db.session.query(
        func.count(TrafficFlow.id),
        func.coalesce(func.sum(TrafficFlow.packet_count), 0)
    ).first()
    total_traffic = traffic_stats[0] if traffic_stats else 0
    total_packets = int(traffic_stats[1]) if traffic_stats else 0

    alert_stats = db.session.query(
        func.count(Alert.id),
        func.coalesce(func.sum(case((Alert.status.in_(["Unresolved", "Investigating"]), 1), else_=0)), 0)
    ).first()
    total_alerts = alert_stats[0] if alert_stats else 0
    unresolved_alerts = int(alert_stats[1]) if alert_stats else 0

    blocked_ips_count = db.session.query(func.count(BlockedIp.id)).scalar() or 0

    capture_stat = get_capture_status()
    is_running = bool(capture_stat.get("running", False))

    active_session = None
    if is_running and capture_stat.get("session_id"):
        active_session = db.session.get(MonitoringSession, capture_stat["session_id"])

    session_info = None
    if active_session:
        session_info = {
            "id": active_session.id,
            "interface": active_session.interface or "default",
            "status": "Running",
            "packet_count": active_session.packets_captured or 0,
            "flows_analyzed": active_session.flows_analyzed or 0,
            "start_time": (
                active_session.start_time.isoformat()
                if active_session.start_time
                else None
            ),
        }

    attack_rows = (
        db.session.query(AttackType.name, func.count(Alert.id))
        .join(Alert, Alert.attack_type_id == AttackType.id)
        .group_by(AttackType.name)
        .order_by(func.count(Alert.id).desc())
        .limit(8)
        .all()
    )
    attack_breakdown = [{"name": name, "count": count} for name, count in attack_rows]

    model_status_info = get_model_status()

    return jsonify({
        "total_traffic": total_traffic,
        "total_packets": total_packets,
        "total_alerts": total_alerts,
        "unresolved_alerts": unresolved_alerts,
        "blocked_ips_count": blocked_ips_count,
        "active_session": session_info,
        "attack_breakdown": attack_breakdown,
        "model_status": model_status_info,
        "monitoring": {
            "running": is_running,
            "session_id": active_session.id if active_session else None,
            "interface": active_session.interface if active_session else (capture_stat.get("interface") or None),
        },
    }), 200

@system_bp.delete("/logs")
def clear_all_logs():
    try:
        from capture.packet_capture import reset_capture_state

        reset_capture_state()

        alert_count = Alert.query.delete(synchronize_session=False)
        flow_count = TrafficFlow.query.delete(synchronize_session=False)
        session_count = MonitoringSession.query.delete(synchronize_session=False)

        db.session.commit()
        return jsonify({
            "message": "All network traffic flows, security alerts, and packet counters have been cleared.",
            "flow_count": flow_count,
            "alert_count": alert_count,
            "session_count": session_count,
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to clear system logs: {str(exc)}"}), 500

@system_bp.get("/settings")
def get_settings():
    settings = get_or_create_settings()
    return jsonify({"settings": settings.to_dict()}), 200

@system_bp.put("/settings")
def update_settings():
    settings = get_or_create_settings()
    data = request.get_json(silent=True) or {}

    if "detectionMode" in data:
        val = str(data["detectionMode"]).upper()
        if val in ("IPS", "IDS"):
            settings.detection_mode = val
    if "confidenceThreshold" in data:
        try:
            settings.confidence_threshold = max(0.0, min(1.0, float(data["confidenceThreshold"])))
        except (ValueError, TypeError):
            pass
    if "autoBlockThreats" in data:
        settings.auto_block_threats = bool(data["autoBlockThreats"])
    if "captureInterface" in data:
        settings.capture_interface = str(data["captureInterface"])
    if "promiscuousMode" in data:
        settings.promiscuous_mode = bool(data["promiscuousMode"])
    if "flowIdleTimeout" in data:
        try:
            settings.flow_idle_timeout = max(1, int(data["flowIdleTimeout"]))
        except (ValueError, TypeError):
            pass

    db.session.add(settings)
    db.session.commit()
    db.session.refresh(settings)

    return jsonify({
        "message": "NIDS configuration saved.",
        "settings": settings.to_dict()
    }), 200

@system_bp.post("/settings/reset")
def reset_settings():
    settings = get_or_create_settings()
    settings.detection_mode = "IDS"
    settings.confidence_threshold = 0.80
    settings.auto_block_threats = False
    settings.capture_interface = "default"
    settings.promiscuous_mode = True
    settings.flow_idle_timeout = 5
    db.session.commit()

    return jsonify({
        "message": "NIDS configuration reset to defaults.",
        "settings": settings.to_dict()
    }), 200

@system_bp.get("/blocked")
def get_blocked_ips():
    blocked = BlockedIp.query.order_by(BlockedIp.blocked_at.desc()).all()
    return jsonify({"count": len(blocked), "blocked": [b.to_dict() for b in blocked]}), 200

@system_bp.post("/blocked")
def block_ip():
    data = request.get_json(silent=True) or {}
    ip = (data.get("ip") or "").strip()
    reason = (data.get("reason") or "Manual Administrator Quarantine").strip()

    if not ip:
        return jsonify({"error": "IP address is required."}), 400

    existing = BlockedIp.query.filter_by(ip=ip).first()
    if existing:
        return jsonify({"error": f"IP {ip} is already quarantined."}), 409

    whitelist_entry = WhitelistIp.query.filter_by(ip=ip).first()
    if whitelist_entry:
        db.session.delete(whitelist_entry)

    entry = BlockedIp(ip=ip, reason=reason, packets_dropped=int(data.get("packets_dropped") or 0))
    db.session.add(entry)
    db.session.commit()

    return jsonify({"message": f"IP {ip} quarantined.", "entry": entry.to_dict()}), 201

@system_bp.delete("/blocked/<path:ip>")
def unblock_ip(ip):
    clean_ip = ip.strip()
    entry = BlockedIp.query.filter_by(ip=clean_ip).first()
    if not entry:
        return jsonify({"error": f"IP {clean_ip} is not blocked."}), 404
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": f"IP {clean_ip} unblocked."}), 200

@system_bp.delete("/blocked")
def clear_blocked():
    count = BlockedIp.query.delete()
    db.session.commit()
    return jsonify({"message": f"Cleared {count} quarantined IP(s)."}), 200

@system_bp.get("/whitelist")
def get_whitelist():
    whitelist = WhitelistIp.query.order_by(WhitelistIp.added_at.desc()).all()
    return jsonify({"count": len(whitelist), "whitelist": [w.to_dict() for w in whitelist]}), 200

@system_bp.post("/whitelist")
def add_whitelist():
    data = request.get_json(silent=True) or {}
    ip = (data.get("ip") or "").strip()
    label = (data.get("label") or "Trusted Host").strip()

    if not ip:
        return jsonify({"error": "IP address is required."}), 400

    existing = WhitelistIp.query.filter_by(ip=ip).first()
    if existing:
        return jsonify({"error": f"IP {ip} already on whitelist."}), 409

    blocked_entry = BlockedIp.query.filter_by(ip=ip).first()
    if blocked_entry:
        db.session.delete(blocked_entry)

    entry = WhitelistIp(ip=ip, label=label)
    db.session.add(entry)
    db.session.commit()

    return jsonify({"message": f"IP {ip} added to whitelist.", "entry": entry.to_dict()}), 201

@system_bp.delete("/whitelist/<path:ip>")
def remove_whitelist(ip):
    clean_ip = ip.strip()
    entry = WhitelistIp.query.filter_by(ip=clean_ip).first()
    if not entry:
        return jsonify({"error": f"IP {clean_ip} not on whitelist."}), 404
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": f"IP {clean_ip} removed from whitelist."}), 200

@system_bp.delete("/whitelist")
def clear_whitelist():
    count = WhitelistIp.query.delete()
    db.session.commit()
    return jsonify({"message": f"Cleared {count} host(s) from whitelist."}), 200
