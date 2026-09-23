from flask import Blueprint, current_app, jsonify, request
from datetime import datetime, timezone

from database.connection import db
from models import MonitoringSession, TrafficFlow
from sqlalchemy import func
from capture.packet_capture import start_capture, stop_capture, get_capture_status

monitoring_bp = Blueprint(
    "monitoring",
    __name__,
    url_prefix="/api/monitoring"
)

@monitoring_bp.post("/start")
def start_monitoring():
    current_status = get_capture_status()

    if current_status.get("running"):
        stop_capture()
        try:
            MonitoringSession.query.filter_by(status="Running").update(
                {"status": "Stopped", "end_time": datetime.now(timezone.utc)},
                synchronize_session=False
            )
            db.session.commit()
        except Exception:
            db.session.rollback()

    data = request.get_json(silent=True) or {}
    interface = data.get("interface")

    if not interface or interface.lower() in ("default", "auto", "any", "loopback", "eth0", "wlan0", "lo"):
        actual_interface = None
        display_interface = "Default Adapter"
    else:
        actual_interface = interface
        display_interface = interface

    session = MonitoringSession(
        interface=display_interface,
        status="Running",
        packets_captured=0,
        flows_analyzed=0,
        attacks_detected=0,
    )

    db.session.add(session)
    db.session.commit()

    try:
        start_capture(
            current_app._get_current_object(),
            actual_interface,
            session.id
        )
    except Exception as exc:
        session.status = "Error"
        session.end_time = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({"error": str(exc)}), 500

    return jsonify({
        "message": "Network monitoring started.",
        "session_id": session.id,
        "interface": display_interface,
        "running": True,
    }), 201

@monitoring_bp.post("/stop")
def stop_monitoring():
    stop_capture()

    app = current_app._get_current_object()
    def _bg_cleanup():
        with app.app_context():
            try:
                MonitoringSession.query.filter_by(status="Running").update(
                    {"status": "Stopped", "end_time": datetime.now(timezone.utc)},
                    synchronize_session=False
                )
                db.session.commit()
            except Exception:
                db.session.rollback()

    import threading
    threading.Thread(target=_bg_cleanup, daemon=True).start()

    return jsonify({
        "message": "Network monitoring stopped.",
        "running": False,
        "session_id": None,
    }), 200

@monitoring_bp.get("/status")
def monitoring_status():
    capture_status = get_capture_status()
    session = None

    if capture_status.get("session_id"):
        session = db.session.get(MonitoringSession, capture_status["session_id"])
    else:
        session = MonitoringSession.query.order_by(MonitoringSession.id.desc()).first()

    is_running = bool(capture_status.get("running"))

    if is_running:
        live_packets = capture_status.get("live_packets", 0)
        session_packets = max(live_packets, session.packets_captured or 0)
    elif session:
        session_packets = session.packets_captured or 0
    else:
        session_packets = 0

    total_system_packets = db.session.query(func.sum(TrafficFlow.packet_count)).scalar() or 0
    total_system_flows = db.session.query(func.count(TrafficFlow.id)).scalar() or 0

    return jsonify({
        "running": is_running,
        "session_id": session.id if session else None,
        "interface": session.interface if session else (capture_status.get("interface") or "Default Adapter"),
        "status": session.status if session else ("Running" if is_running else "Stopped"),
        "packets_captured": session_packets,
        "session_packets": session_packets,
        "total_packets": total_system_packets,
        "total_flows": total_system_flows,
        "flows_analyzed": session.flows_analyzed if session else 0,
        "attacks_detected": session.attacks_detected if session else 0,
    })
