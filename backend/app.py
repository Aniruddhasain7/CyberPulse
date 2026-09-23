import sys

sys.dont_write_bytecode = True

from flask import Flask
from flask_cors import CORS

from config import Config
from database.connection import db

from models import (
    MonitoringSession,
    AttackType,
    TrafficFlow,
    Alert,
    BlockedIp,
    WhitelistIp,
    SystemSettings,
    seed_default_ips,
    get_or_create_settings,
)

from routes.monitoring_routes import monitoring_bp
from routes.alert_routes import alert_bp
from routes.traffic_routes import traffic_bp
from routes.system_routes import system_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    with app.app_context():
        db.create_all()
        from capture.packet_capture import reset_capture_state
        reset_capture_state()
        MonitoringSession.query.filter_by(status="Running").update({"status": "Stopped"})
        db.session.commit()
        seed_default_ips()
        get_or_create_settings()

    app.register_blueprint(monitoring_bp)
    app.register_blueprint(alert_bp)
    app.register_blueprint(traffic_bp)
    app.register_blueprint(system_bp)

    @app.get("/")
    def home():
        return {"message": "CyberPulse NIDS backend is running", "status": "success"}

    @app.get("/api/health")
    def health():
        return {"status": "healthy"}

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
