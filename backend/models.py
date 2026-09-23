from datetime import datetime, timezone
from database.connection import db

class MonitoringSession(db.Model):
    __tablename__ = "monitoring_sessions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    start_time = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    end_time = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="Running")
    interface = db.Column(db.String(100), nullable=False)
    packets_captured = db.Column(db.Integer, nullable=False, default=0)
    flows_analyzed = db.Column(db.Integer, nullable=False, default=0)
    attacks_detected = db.Column(db.Integer, nullable=False, default=0)

    traffic_flows = db.relationship("TrafficFlow", back_populates="monitoring_session")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class AttackType(db.Model):
    __tablename__ = "attack_types"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(20), nullable=False)

    alerts = db.relationship("Alert", back_populates="attack_type")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class TrafficFlow(db.Model):
    __tablename__ = "traffic_flows"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    monitoring_session_id = db.Column(
        db.Integer, db.ForeignKey("monitoring_sessions.id"), nullable=True
    )
    timestamp = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    source_ip = db.Column(db.String(45), nullable=False, index=True)
    destination_ip = db.Column(db.String(45), nullable=False, index=True)
    source_port = db.Column(db.Integer, nullable=True)
    destination_port = db.Column(db.Integer, nullable=True)
    protocol = db.Column(db.String(20), nullable=False)
    duration = db.Column(db.Float, nullable=False, default=0.0)
    packet_count = db.Column(db.Integer, nullable=False, default=0)
    byte_count = db.Column(db.Integer, nullable=False, default=0)
    source_bytes = db.Column(db.Integer, nullable=False, default=0)
    destination_bytes = db.Column(db.Integer, nullable=False, default=0)
    packet_rate = db.Column(db.Float, nullable=False, default=0.0)
    byte_rate = db.Column(db.Float, nullable=False, default=0.0)
    prediction = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    monitoring_session = db.relationship("MonitoringSession", back_populates="traffic_flows")
    alert = db.relationship("Alert", back_populates="traffic_flow", uselist=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    traffic_flow_id = db.Column(
        db.Integer, db.ForeignKey("traffic_flows.id"), nullable=True
    )
    attack_type_id = db.Column(
        db.Integer, db.ForeignKey("attack_types.id"), nullable=True
    )
    source_ip = db.Column(db.String(45), nullable=False)
    destination_ip = db.Column(db.String(45), nullable=False)
    severity = db.Column(db.String(20), nullable=False)
    confidence = db.Column(db.Float, nullable=False, default=0.0)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="Unresolved")
    timestamp = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    traffic_flow = db.relationship("TrafficFlow", back_populates="alert")
    attack_type = db.relationship("AttackType", back_populates="alerts")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        attack_title = (
            self.attack_type.name if self.attack_type else "Network Threat Anomaly"
        )
        return {
            "id": self.id,
            "traffic_flow_id": self.traffic_flow_id,
            "attack_type": attack_title,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "severity": self.severity,
            "confidence": round(self.confidence, 2) if self.confidence else 0.85,
            "description": self.description,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

class BlockedIp(db.Model):
    __tablename__ = "blocked_ips"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ip = db.Column(db.String(45), unique=True, nullable=False, index=True)
    reason = db.Column(
        db.String(255), nullable=False, default="Manual Administrator Quarantine"
    )
    blocked_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    packets_dropped = db.Column(db.Integer, nullable=False, default=0)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "ip": self.ip,
            "reason": self.reason,
            "blockedAt": self.blocked_at.isoformat() if self.blocked_at else None,
            "packetsDropped": self.packets_dropped,
        }

class WhitelistIp(db.Model):
    __tablename__ = "whitelist_ips"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ip = db.Column(db.String(45), unique=True, nullable=False, index=True)
    label = db.Column(db.String(120), nullable=False, default="Trusted Host")
    added_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "ip": self.ip,
            "label": self.label,
            "addedAt": self.added_at.isoformat() if self.added_at else None,
        }

_DEFAULT_BLOCKED_IPS = [
    {"ip": "185.220.101.5", "reason": "Automated SYN Flood DDoS Ingress", "packets_dropped": 4820},
    {"ip": "45.33.32.156", "reason": "Aggressive TCP Port Reconnaissance", "packets_dropped": 1420},
    {"ip": "103.208.220.12", "reason": "SSH Auth Brute Force Credential Abuse", "packets_dropped": 640},
]

_DEFAULT_WHITELIST_IPS = [
    {"ip": "192.168.1.1", "label": "Gateway Router / Core Switch"},
    {"ip": "8.8.8.8", "label": "Google Public DNS Resolver"},
    {"ip": "1.1.1.1", "label": "Cloudflare Secure DNS Gateway"},
    {"ip": "127.0.0.1", "label": "Loopback Localhost"},
]

def seed_default_ips():
    if BlockedIp.query.count() == 0:
        for b in _DEFAULT_BLOCKED_IPS:
            db.session.add(BlockedIp(**b))
    if WhitelistIp.query.count() == 0:
        for w in _DEFAULT_WHITELIST_IPS:
            db.session.add(WhitelistIp(**w))
    db.session.commit()

class SystemSettings(db.Model):
    __tablename__ = "system_settings"

    id = db.Column(db.Integer, primary_key=True)
    detection_mode = db.Column(db.String(10), nullable=False, default="IDS")
    confidence_threshold = db.Column(db.Float, nullable=False, default=0.80)
    auto_block_threats = db.Column(db.Boolean, nullable=False, default=False)
    capture_interface = db.Column(db.String(30), nullable=False, default="default")
    promiscuous_mode = db.Column(db.Boolean, nullable=False, default=True)
    flow_idle_timeout = db.Column(db.Integer, nullable=False, default=5)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            "detectionMode": self.detection_mode,
            "confidenceThreshold": self.confidence_threshold,
            "autoBlockThreats": self.auto_block_threats,
            "captureInterface": self.capture_interface,
            "promiscuousMode": self.promiscuous_mode,
            "flowIdleTimeout": self.flow_idle_timeout,
        }

def get_or_create_settings():
    settings = db.session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings(id=1)
        db.session.add(settings)
        db.session.commit()
    return settings
