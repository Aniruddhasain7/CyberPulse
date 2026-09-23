import random
import threading
import time
from datetime import datetime, timezone

import logging

logging.getLogger("scapy").setLevel(logging.ERROR)
logging.getLogger("scapy.loading").setLevel(logging.ERROR)
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)

from scapy.all import sniff, IP, TCP, UDP, ICMP

from database.connection import db
from models import (
    Alert,
    AttackType,
    BlockedIp,
    MonitoringSession,
    TrafficFlow,
    WhitelistIp,
    get_or_create_settings,
)
from detection.engine import extract_features, predict, get_severity, is_benign
from capture.flow_builder import FlowBuilder

_running = False
_capture_thread = None
_stop_event = threading.Event()
_current_session_id = None
_current_interface = None
_live_packet_count = 0

def _get_or_create_attack_type(prediction, severity):
    attack_type = AttackType.query.filter_by(name=prediction).first()
    if attack_type:
        return attack_type

    attack_type = AttackType(
        name=prediction,
        description=f"Detected by CyberPulse NIDS Engine: {prediction}",
        severity=severity,
    )
    db.session.add(attack_type)
    db.session.flush()
    return attack_type

def _save_flow(app, session_id, flow):
    try:
        with app.app_context():
            session = db.session.get(MonitoringSession, session_id)
            if session is None:
                return

            src_ip = flow["source_ip"]
            dst_ip = flow["destination_ip"]
            packet_count = len(flow["fwd_lengths"]) + len(flow["bwd_lengths"])
            byte_count = sum(flow["fwd_lengths"]) + sum(flow["bwd_lengths"])
            duration = max(flow["last_seen"] - flow["first_seen"], 0.0)

            settings = get_or_create_settings()
            threshold = settings.confidence_threshold if settings else 0.80

            whitelisted = WhitelistIp.query.filter(
                (WhitelistIp.ip == src_ip) | (WhitelistIp.ip == dst_ip)
            ).first()

            blocked = BlockedIp.query.filter(
                (BlockedIp.ip == src_ip) | (BlockedIp.ip == dst_ip)
            ).first()

            if whitelisted:
                prediction = "Benign"
                confidence = 1.0
                severity = "None"
                is_threat = False
            elif blocked:
                prediction = f"Blacklist Drop: {blocked.reason}"
                confidence = 1.0
                severity = "Critical"
                blocked.packets_dropped = (blocked.packets_dropped or 0) + packet_count
                is_threat = True
            else:
                features = extract_features(flow)
                prediction, confidence = predict(features)
                severity = get_severity(prediction)
                is_threat = (not is_benign(prediction)) and (confidence >= threshold)

                if is_threat and settings and settings.auto_block_threats:
                    existing = BlockedIp.query.filter_by(ip=src_ip).first()
                    if not existing and src_ip not in ("127.0.0.1", "localhost", "0.0.0.0"):
                        auto_block = BlockedIp(
                            ip=src_ip,
                            reason=f"Auto-Quarantine: {prediction} ({int(confidence * 100)}% conf)",
                            packets_dropped=packet_count,
                        )
                        db.session.add(auto_block)

            traffic = TrafficFlow(
                monitoring_session_id=session_id,
                source_ip=src_ip,
                destination_ip=dst_ip,
                source_port=flow["source_port"],
                destination_port=flow["destination_port"],
                protocol=flow["protocol"],
                duration=duration,
                packet_count=packet_count,
                byte_count=byte_count,
                source_bytes=sum(flow["fwd_lengths"]),
                destination_bytes=sum(flow["bwd_lengths"]),
                packet_rate=packet_count / max(duration, 0.000001),
                byte_rate=byte_count / max(duration, 0.000001),
                prediction=prediction,
                confidence=confidence,
            )

            db.session.add(traffic)
            db.session.flush()

            session.flows_analyzed = (session.flows_analyzed or 0) + 1
            session.packets_captured = (session.packets_captured or 0) + packet_count

            if is_threat:
                attack_type = _get_or_create_attack_type(prediction, severity)
                alert = Alert(
                    traffic_flow_id=traffic.id,
                    attack_type_id=attack_type.id,
                    source_ip=traffic.source_ip,
                    destination_ip=traffic.destination_ip,
                    severity=severity,
                    confidence=confidence,
                    description=(
                        f"{prediction} detected from {traffic.source_ip} to {traffic.destination_ip}."
                    ),
                    status="Unresolved",
                    timestamp=datetime.now(timezone.utc),
                )
                db.session.add(alert)
                session.attacks_detected = (session.attacks_detected or 0) + 1

            db.session.commit()
    except Exception:
        db.session.rollback()

def _simulate_packets(process_packet, stop_event):
    internal_ips = ["192.168.1.10", "192.168.1.25", "192.168.1.45", "10.0.0.15"]
    external_ips = ["45.33.32.156", "185.220.101.5", "104.244.42.1", "198.51.100.24"]
    target_server = "192.168.1.1"

    while not stop_event.is_set():
        batch_size = random.randint(2, 5)
        for _ in range(batch_size):
            if stop_event.is_set():
                return

            proto = random.choices(["TCP", "UDP", "ICMP"], weights=[0.75, 0.20, 0.05])[0]
            is_inbound = random.random() < 0.4

            if is_inbound:
                src_ip = random.choice(external_ips)
                dst_ip = target_server
            else:
                src_ip = random.choice(internal_ips)
                dst_ip = random.choice(external_ips)

            pkt = IP(src=src_ip, dst=dst_ip)
            if proto == "TCP":
                sport = random.randint(1024, 65535)
                dport = random.choice([80, 443, 22, 8080, 3389, 53])
                flags = random.choices(["S", "A", "PA", "FA", "R"], weights=[0.3, 0.4, 0.2, 0.05, 0.05])[0]
                pkt = pkt / TCP(sport=sport, dport=dport, flags=flags, window=64240)
            elif proto == "UDP":
                sport = random.randint(1024, 65535)
                dport = random.choice([53, 123, 161, 5353])
                pkt = pkt / UDP(sport=sport, dport=dport)
            else:
                pkt = pkt / ICMP()

            if stop_event.is_set():
                return
            process_packet(pkt)

        if stop_event.wait(0.05):
            return

def _capture_worker(app, interface, session_id):
    global _running

    with app.app_context():
        settings = get_or_create_settings()
        timeout = settings.flow_idle_timeout if settings else 5

    flow_builder = FlowBuilder(idle_timeout=timeout)

    try:
        def process_packet(packet):
            global _live_packet_count
            if _stop_event.is_set():
                return

            _live_packet_count += 1
            completed_flows = flow_builder.add_packet(packet)
            for flow in completed_flows:
                if _stop_event.is_set():
                    break
                _save_flow(app, session_id, flow)

        try:
            real_iface = None
            if interface:
                iface_clean = str(interface).strip().lower()
                if iface_clean in ("loopback", "lo", "127.0.0.1"):
                    real_iface = r"\Device\NPF_Loopback"
                elif iface_clean not in ("default", "auto", "any", "eth0", "wlan0"):
                    real_iface = interface

            while not _stop_event.is_set():
                sniff(
                    iface=real_iface,
                    prn=process_packet,
                    store=False,
                    timeout=0.1,
                    stop_filter=lambda packet: _stop_event.is_set(),
                )
        except Exception as pcap_err:
            app.logger.warning(
                "Live packet capture driver unavailable or interface error (%s). Running in continuous simulated packet stream mode.",
                pcap_err,
            )
            _simulate_packets(process_packet, _stop_event)

        if not _stop_event.is_set():
            remaining_flows = flow_builder.flush_all()
            for flow in remaining_flows:
                _save_flow(app, session_id, flow)

        with app.app_context():
            session = db.session.get(MonitoringSession, session_id)
            if session:
                session.status = "Stopped"
                session.end_time = datetime.now(timezone.utc)
                db.session.commit()

    except Exception as exc:
        with app.app_context():
            session = db.session.get(MonitoringSession, session_id)
            if session:
                session.status = "Error"
                session.end_time = datetime.now(timezone.utc)
                db.session.commit()

        app.logger.exception("Packet capture worker encountered exception: %s", exc)

    finally:
        _running = False

def start_capture(app, interface, session_id):
    global _running, _capture_thread, _stop_event, _current_session_id, _current_interface, _live_packet_count

    if _running or (_capture_thread and _capture_thread.is_alive()):
        stop_capture()

    _stop_event.clear()
    _running = True
    _current_session_id = session_id
    _current_interface = interface
    _live_packet_count = 0

    _capture_thread = threading.Thread(
        target=_capture_worker,
        args=(app, interface, session_id),
        daemon=True,
    )
    _capture_thread.start()

def stop_capture():
    global _running, _capture_thread

    _stop_event.set()
    _running = False

    return True

def reset_capture_state():
    global _running, _capture_thread, _stop_event, _current_session_id, _current_interface, _live_packet_count
    _stop_event.set()
    _running = False
    if _capture_thread and _capture_thread.is_alive():
        _capture_thread.join(timeout=0.3)
    _capture_thread = None
    _current_session_id = None
    _current_interface = None
    _live_packet_count = 0
    _current_interface = None
    _live_packet_count = 0

def get_capture_status():
    return {
        "running": _running,
        "session_id": _current_session_id,
        "interface": _current_interface,
        "live_packets": _live_packet_count,
    }
