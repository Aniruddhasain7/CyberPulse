from flask import Blueprint, jsonify, request
from database.connection import db
from models import TrafficFlow, Alert

traffic_bp = Blueprint(
    "traffic",
    __name__,
    url_prefix="/api/traffic"
)

@traffic_bp.get("")
def get_traffic():

    try:
        limit = int(
            request.args.get(
                "limit",
                100
            )
        )
    except ValueError:
        limit = 100

    limit = max(
        1,
        min(limit, 200)
    )

    flows = TrafficFlow.query.order_by(
        TrafficFlow.timestamp.desc()
    ).limit(limit).all()

    data = []

    for flow in flows:

        data.append({
            "id": flow.id,

            "timestamp": (
                flow.timestamp.isoformat()
                if flow.timestamp
                else None
            ),

            "source_ip": flow.source_ip,
            "destination_ip": flow.destination_ip,

            "source_port": flow.source_port,
            "destination_port": flow.destination_port,

            "protocol": flow.protocol,

            "duration": flow.duration,

            "packet_count": flow.packet_count,

            "byte_count": flow.byte_count,

            "source_bytes": flow.source_bytes,

            "destination_bytes": flow.destination_bytes,

            "packet_rate": flow.packet_rate,

            "byte_rate": flow.byte_rate,

            "prediction": flow.prediction,

            "confidence": flow.confidence,
        })

    return jsonify({
        "count": len(data),
        "traffic": data
    })

@traffic_bp.delete("")
def clear_traffic():
    try:
        from capture.packet_capture import reset_capture_state
        from models import MonitoringSession

        reset_capture_state()

        Alert.query.delete(synchronize_session=False)
        count = TrafficFlow.query.delete(synchronize_session=False)
        MonitoringSession.query.delete(synchronize_session=False)
        db.session.commit()

        return jsonify({
            "message": f"Cleared {count} traffic flow record(s), associated alerts, and reset packet counters.",
            "count": count
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to clear traffic: {str(exc)}"}), 500
