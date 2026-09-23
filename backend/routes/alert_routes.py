import random
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from database.connection import db
from models import Alert, AttackType, TrafficFlow, MonitoringSession

alert_bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")

@alert_bp.get("")
def get_alerts():
    status = request.args.get("status")
    try:
        limit = int(request.args.get("limit", 100))
    except ValueError:
        limit = 100
    limit = max(1, min(limit, 250))

    query = Alert.query
    if status:
        query = query.filter(Alert.status == status)

    alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()

    return jsonify({
        "count": len(alerts),
        "alerts": [a.to_dict() for a in alerts]
    }), 200

@alert_bp.patch("/<int:alert_id>")
def update_alert(alert_id):
    alert = db.session.get(Alert, alert_id)
    if alert is None:
        return jsonify({"error": "Alert not found."}), 404

    data = request.get_json(silent=True) or {}
    status = data.get("status", "Resolved")

    allowed_statuses = {"Unresolved", "Investigating", "Resolved", "Mitigated", "False Positive"}
    if status not in allowed_statuses:
        status = "Resolved"

    alert.status = status
    db.session.commit()

    return jsonify({
        "message": f"Alert {alert.id} updated to {status}.",
        "alert": alert.to_dict()
    }), 200

@alert_bp.patch("/<int:alert_id>/resolve")
def resolve_single_alert(alert_id):
    alert = db.session.get(Alert, alert_id)
    if alert is None:
        return jsonify({"error": "Alert not found."}), 404

    alert.status = "Resolved"
    db.session.commit()

    return jsonify({
        "message": f"Alert {alert.id} marked as Resolved.",
        "alert": alert.to_dict()
    }), 200

@alert_bp.post("/resolve-all")
def resolve_all_alerts():
    unresolved = Alert.query.filter(Alert.status.in_(["Unresolved", "Investigating"])).all()
    count = len(unresolved)
    for a in unresolved:
        a.status = "Resolved"
    db.session.commit()

    return jsonify({
        "message": f"All {count} active threat alerts have been resolved.",
        "resolved_count": count
    }), 200

@alert_bp.delete("/<int:alert_id>")
def delete_alert(alert_id):
    alert = db.session.get(Alert, alert_id)
    if alert is None:
        return jsonify({"error": "Alert not found."}), 404

    db.session.delete(alert)
    db.session.commit()

    return jsonify({"message": f"Alert {alert_id} deleted successfully."}), 200

@alert_bp.delete("")
def clear_all_alerts():
    try:
        count = Alert.query.delete(synchronize_session=False)
        db.session.commit()
        return jsonify({
            "message": f"Cleared all {count} alert(s) from database.",
            "cleared_count": count
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to clear alerts: {str(exc)}"}), 500

@alert_bp.delete("/resolved")
def clear_resolved_alerts():
    try:
        count = Alert.query.filter(Alert.status.in_(["Resolved", "Mitigated"])).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({
            "message": f"Cleared {count} resolved alert(s) from database.",
            "cleared_count": count
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to clear resolved alerts: {str(exc)}"}), 500

@alert_bp.post("/simulate")
def simulate_threat():
    data = request.get_json(silent=True) or {}
    scenario = (data.get("scenario") or data.get("type") or "SYN_FLOOD").upper()

    scenarios = {
        "SYN_FLOOD": {
            "attack_type": "SYN Flood / DoS",
            "severity": "Critical",
            "confidence": 0.98,
            "source_ip": f"185.220.{random.randint(10, 200)}.{random.randint(2, 250)}",
            "destination_ip": "10.0.0.1:80",
            "protocol": "TCP",
            "port": 80,
            "packets": random.randint(4000, 8000),
            "bytes": random.randint(2000000, 5000000),
            "description": "Abnormal volume of half-open TCP SYN flags exceeding threshold limit.",
        },
        "PORT_SCAN": {
            "attack_type": "Aggressive Port Scan (Nmap)",
            "severity": "High",
            "confidence": 0.94,
            "source_ip": f"45.33.{random.randint(10, 100)}.{random.randint(2, 250)}",
            "destination_ip": "10.0.0.1:multiple",
            "protocol": "TCP",
            "port": 443,
            "packets": random.randint(80, 250),
            "bytes": random.randint(4000, 12000),
            "description": "Sequential rapid probe across closed port sockets detecting live services.",
        },
        "BRUTE_FORCE": {
            "attack_type": "SSH Password Brute Force",
            "severity": "Medium",
            "confidence": 0.89,
            "source_ip": f"103.208.{random.randint(10, 150)}.{random.randint(2, 250)}",
            "destination_ip": "10.0.0.1:22",
            "protocol": "TCP",
            "port": 22,
            "packets": random.randint(30, 80),
            "bytes": random.randint(2000, 5000),
            "description": "Repeated failed authentication handshakes detected within 60s.",
        },
        "PING_SWEEP": {
            "attack_type": "ICMP Echo Sweep",
            "severity": "Low",
            "confidence": 0.82,
            "source_ip": f"198.51.{random.randint(10, 100)}.{random.randint(2, 250)}",
            "destination_ip": "10.0.0.0/24",
            "protocol": "ICMP",
            "port": 0,
            "packets": random.randint(120, 300),
            "bytes": random.randint(8000, 20000),
            "description": "Elevated rate of ICMP echo requests discovering responsive hosts.",
        },
        "SQLI": {
            "attack_type": "SQL Injection Attempt",
            "severity": "Critical",
            "confidence": 0.97,
            "source_ip": f"91.240.{random.randint(10, 100)}.{random.randint(2, 250)}",
            "destination_ip": "10.0.0.1:80",
            "protocol": "TCP",
            "port": 80,
            "packets": random.randint(15, 45),
            "bytes": random.randint(1500, 6000),
            "description": "Malicious SQL payload signature detected in HTTP GET query string.",
        },
        "DNS_AMP": {
            "attack_type": "DNS Amplification Attack",
            "severity": "Critical",
            "confidence": 0.96,
            "source_ip": f"194.165.{random.randint(10, 200)}.{random.randint(2, 250)}",
            "destination_ip": "10.0.0.1:53",
            "protocol": "UDP",
            "port": 53,
            "packets": random.randint(2000, 6000),
            "bytes": random.randint(500000, 3000000),
            "description": "High-volume UDP DNS response amplification flood targeting resolver infrastructure.",
        },
    }

    selected = scenarios.get(scenario, scenarios["SYN_FLOOD"])

    attack_type = AttackType.query.filter_by(name=selected["attack_type"]).first()
    if not attack_type:
        attack_type = AttackType(
            name=selected["attack_type"],
            description=selected["description"],
            severity=selected["severity"]
        )
        db.session.add(attack_type)
        db.session.flush()

    active_session = MonitoringSession.query.filter_by(status="Running").order_by(MonitoringSession.id.desc()).first()

    flow = TrafficFlow(
        monitoring_session_id=active_session.id if active_session else None,
        source_ip=selected["source_ip"],
        destination_ip=selected["destination_ip"].split(":")[0],
        source_port=random.randint(1024, 65535),
        destination_port=selected["port"],
        protocol=selected["protocol"],
        duration=round(random.uniform(0.1, 3.5), 2),
        packet_count=selected["packets"],
        byte_count=selected["bytes"],
        source_bytes=selected["bytes"],
        destination_bytes=int(selected["bytes"] * 0.15),
        packet_rate=round(selected["packets"] / 1.5, 2),
        byte_rate=round(selected["bytes"] / 1.5, 2),
        prediction=selected["attack_type"],
        confidence=selected["confidence"],
    )
    db.session.add(flow)
    db.session.flush()

    alert = Alert(
        traffic_flow_id=flow.id,
        attack_type_id=attack_type.id,
        source_ip=selected["source_ip"],
        destination_ip=selected["destination_ip"],
        severity=selected["severity"],
        confidence=selected["confidence"],
        description=selected["description"],
        status="Unresolved",
        timestamp=datetime.now(timezone.utc)
    )
    db.session.add(alert)

    if active_session:
        active_session.attacks_detected = (active_session.attacks_detected or 0) + 1
        active_session.packets_captured = (active_session.packets_captured or 0) + selected["packets"]

    db.session.commit()

    return jsonify({
        "message": f"Threat simulation '{selected['attack_type']}' generated and recorded to database.",
        "alert": alert.to_dict(),
        "flow_id": flow.id
    }), 201
