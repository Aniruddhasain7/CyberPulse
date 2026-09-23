import time

class FlowBuilder:
    def __init__(self, idle_timeout=5):
        self.idle_timeout = idle_timeout
        self.flows = {}

    @staticmethod
    def _packet_info(packet):
        flags_int = 0
        window = 0
        hdr_len = 20

        if packet.haslayer("TCP"):
            protocol = "TCP"
            source_port = int(packet["TCP"].sport)
            destination_port = int(packet["TCP"].dport)
            try:
                flags_int = int(packet["TCP"].flags)
            except Exception:
                flags_int = 0
            win_val = getattr(packet["TCP"], "window", 0)
            window = int(win_val) if win_val is not None else 0
            dataofs_val = getattr(packet["TCP"], "dataofs", 5)
            hdr_len = (int(dataofs_val) * 4) if dataofs_val is not None else 20

        elif packet.haslayer("UDP"):
            protocol = "UDP"
            source_port = int(packet["UDP"].sport)
            destination_port = int(packet["UDP"].dport)
            hdr_len = 8

        elif packet.haslayer("ICMP"):
            protocol = "ICMP"
            source_port = None
            destination_port = None
            hdr_len = 8

        else:
            return None

        if not packet.haslayer("IP"):
            return None

        ihl_val = getattr(packet["IP"], "ihl", 5)
        ip_hdr_len = (int(ihl_val) * 4) if ihl_val is not None else 20
        hdr_len += ip_hdr_len

        return {
            "source_ip": packet["IP"].src,
            "destination_ip": packet["IP"].dst,
            "source_port": source_port,
            "destination_port": destination_port,
            "protocol": protocol,
            "flags": flags_int,
            "window": window,
            "hdr_len": hdr_len,
        }

    def _flow_key(self, info):
        endpoint_a = (info["source_ip"], info["source_port"])
        endpoint_b = (info["destination_ip"], info["destination_port"])
        endpoints = tuple(sorted([endpoint_a, endpoint_b]))
        return (endpoints[0], endpoints[1], info["protocol"])

    def add_packet(self, packet):
        info = self._packet_info(packet)
        if info is None:
            return []

        packet_time = float(getattr(packet, "time", time.time()))
        packet_length = len(packet)
        key = self._flow_key(info)

        if key not in self.flows:
            self.flows[key] = {
                "source_ip": info["source_ip"],
                "destination_ip": info["destination_ip"],
                "source_port": info["source_port"],
                "destination_port": info["destination_port"],
                "protocol": info["protocol"],
                "first_seen": packet_time,
                "last_seen": packet_time,
                "fwd_lengths": [],
                "bwd_lengths": [],
                "fwd_times": [],
                "bwd_times": [],
                "all_times": [],
                "flags": {
                    "fin": 0, "syn": 0, "rst": 0, "psh": 0,
                    "ack": 0, "urg": 0, "cwe": 0, "ece": 0,
                },
                "fwd_psh": 0,
                "bwd_psh": 0,
                "fwd_urg": 0,
                "bwd_urg": 0,
                "fwd_header_len": 0,
                "bwd_header_len": 0,
                "init_fwd_win": 0,
                "init_bwd_win": 0,
            }

        flow = self.flows[key]
        flow["last_seen"] = packet_time
        flow["all_times"].append(packet_time)

        is_fwd = (
            info["source_ip"] == flow["source_ip"]
            and info["destination_ip"] == flow["destination_ip"]
            and info["source_port"] == flow["source_port"]
            and info["destination_port"] == flow["destination_port"]
        )

        flags = info.get("flags", 0)
        fin = 1 if (flags & 0x01) else 0
        syn = 1 if (flags & 0x02) else 0
        rst = 1 if (flags & 0x04) else 0
        psh = 1 if (flags & 0x08) else 0
        ack = 1 if (flags & 0x10) else 0
        urg = 1 if (flags & 0x20) else 0
        ece = 1 if (flags & 0x40) else 0
        cwe = 1 if (flags & 0x80) else 0

        flow["flags"]["fin"] += fin
        flow["flags"]["syn"] += syn
        flow["flags"]["rst"] += rst
        flow["flags"]["psh"] += psh
        flow["flags"]["ack"] += ack
        flow["flags"]["urg"] += urg
        flow["flags"]["ece"] += ece
        flow["flags"]["cwe"] += cwe

        if is_fwd:
            flow["fwd_lengths"].append(packet_length)
            flow["fwd_times"].append(packet_time)
            flow["fwd_header_len"] += info["hdr_len"]
            if psh:
                flow["fwd_psh"] += 1
            if urg:
                flow["fwd_urg"] += 1
            if flow["init_fwd_win"] == 0 and info["window"] > 0:
                flow["init_fwd_win"] = info["window"]
        else:
            flow["bwd_lengths"].append(packet_length)
            flow["bwd_times"].append(packet_time)
            flow["bwd_header_len"] += info["hdr_len"]
            if psh:
                flow["bwd_psh"] += 1
            if urg:
                flow["bwd_urg"] += 1
            if flow["init_bwd_win"] == 0 and info["window"] > 0:
                flow["init_bwd_win"] = info["window"]

        return self.flush_expired(packet_time)

    def flush_expired(self, current_time=None):
        if current_time is None:
            current_time = time.time()

        completed = []
        expired_keys = []

        for key, flow in self.flows.items():
            if current_time - flow["last_seen"] >= self.idle_timeout:
                completed.append(flow)
                expired_keys.append(key)

        for key in expired_keys:
            del self.flows[key]

        return completed

    def flush_all(self):
        completed = list(self.flows.values())
        self.flows.clear()
        return completed
