import math
from pathlib import Path

import joblib
import numpy as np
import onnxruntime as ort
import pandas as pd

from config import Config

DEFAULT_CLASSES = [
    "Benign",
    "Bot",
    "DDoS",
    "DoS GoldenEye",
    "DoS Hulk",
    "DoS Slowhttptest",
    "DoS slowloris",
    "FTP-Patator",
    "Heartbleed",
    "Infiltration",
    "PortScan",
    "SSH-Patator",
    "Web Attack - Brute Force",
    "Web Attack - Sql Injection",
    "Web Attack - XSS",
]

NORMAL_LABELS = {"normal", "benign", "normal traffic"}

_session = None
_scaler = None
_input_name = None
_output_name = None
_class_names = list(DEFAULT_CLASSES)
_feature_columns = None
_warned_missing = False

def _load_artifacts():
    global _session, _scaler, _input_name, _output_name, _class_names, _feature_columns, _warned_missing

    if _session is not None and _scaler is not None:
        return True

    model_path = Path(Config.MODEL_PATH)
    scaler_path = Path(Config.SCALER_PATH)

    if not model_path.exists() or not scaler_path.exists():
        if not _warned_missing:
            print(
                f"[Engine] ML artifacts not found ({model_path} / {scaler_path}). "
                "Using heuristic baseline until artifacts are placed."
            )
            _warned_missing = True
        return False

    try:
        _scaler = joblib.load(scaler_path)
        if hasattr(_scaler, "feature_names_in_"):
            _feature_columns = list(_scaler.feature_names_in_)

        _session = ort.InferenceSession(
            str(model_path), providers=["CPUExecutionProvider"]
        )
        _input_name = _session.get_inputs()[0].name
        _output_name = _session.get_outputs()[0].name

        try:
            meta = _session.get_modelmeta().custom_metadata_map
            raw_classes = meta.get("classes", "").split("|")
            parsed = [c.replace("\ufffd", "-").strip() for c in raw_classes if c.strip()]
            if len(parsed) >= 2:
                _class_names = parsed
        except Exception:
            _class_names = list(DEFAULT_CLASSES)

        print(
            f"[Engine] ONNX model & scaler loaded successfully. "
            f"({len(_class_names)} classes, {len(_feature_columns) if _feature_columns else 77} features)"
        )
        return True
    except Exception as exc:
        print(f"[Engine] Error loading ONNX model or scaler: {exc}. Using heuristic baseline.")
        return False

def get_model_status():
    loaded = _load_artifacts()
    return {
        "loaded": bool(loaded and _session is not None),
        "path": Config.MODEL_PATH,
        "scaler_path": Config.SCALER_PATH,
        "num_classes": len(_class_names),
        "classes": _class_names,
    }

def _compute_iats(times):
    if len(times) < 2:
        return 0.0, 0.0, 0.0, 0.0, 0.0
    sorted_times = sorted(times)
    iats = [(sorted_times[i] - sorted_times[i - 1]) * 1_000_000 for i in range(1, len(sorted_times))]
    total_iat = float(sum(iats))
    mean_iat = float(np.mean(iats))
    std_iat = float(np.std(iats)) if len(iats) > 1 else 0.0
    max_iat = float(max(iats))
    min_iat = float(min(iats))
    return total_iat, mean_iat, std_iat, max_iat, min_iat

def extract_features(flow) -> pd.DataFrame:
    _load_artifacts()
    cols = _feature_columns or []

    duration_sec = max(float(flow.get("last_seen", 0) - flow.get("first_seen", 0)), 0.000001)
    duration_us = duration_sec * 1_000_000

    fwd = flow.get("fwd_lengths", [])
    bwd = flow.get("bwd_lengths", [])
    all_lens = fwd + bwd

    fwd_n = len(fwd)
    bwd_n = len(bwd)
    all_n = len(all_lens)

    fwd_b = sum(fwd)
    bwd_b = sum(bwd)
    all_b = sum(all_lens)

    proto_map = {"ICMP": 1, "TCP": 6, "UDP": 17}
    proto_val = proto_map.get(str(flow.get("protocol", "")).upper(), 0)

    all_times = flow.get("all_times", [])
    fwd_times = flow.get("fwd_times", [])
    bwd_times = flow.get("bwd_times", [])

    _, flow_iat_mean, flow_iat_std, flow_iat_max, flow_iat_min = _compute_iats(all_times)
    fwd_iat_tot, fwd_iat_mean, fwd_iat_std, fwd_iat_max, fwd_iat_min = _compute_iats(fwd_times)
    bwd_iat_tot, bwd_iat_mean, bwd_iat_std, bwd_iat_max, bwd_iat_min = _compute_iats(bwd_times)

    flags = flow.get("flags", {})

    feat = {
        "Protocol": float(proto_val),
        "Flow Duration": float(duration_us),
        "Total Fwd Packets": float(fwd_n),
        "Total Backward Packets": float(bwd_n),
        "Fwd Packets Length Total": float(fwd_b),
        "Bwd Packets Length Total": float(bwd_b),
        "Fwd Packet Length Max": float(max(fwd)) if fwd else 0.0,
        "Fwd Packet Length Min": float(min(fwd)) if fwd else 0.0,
        "Fwd Packet Length Mean": float(np.mean(fwd)) if fwd else 0.0,
        "Fwd Packet Length Std": float(np.std(fwd)) if len(fwd) > 1 else 0.0,
        "Bwd Packet Length Max": float(max(bwd)) if bwd else 0.0,
        "Bwd Packet Length Min": float(min(bwd)) if bwd else 0.0,
        "Bwd Packet Length Mean": float(np.mean(bwd)) if bwd else 0.0,
        "Bwd Packet Length Std": float(np.std(bwd)) if len(bwd) > 1 else 0.0,
        "Flow Bytes/s": float(all_b / duration_sec),
        "Flow Packets/s": float(all_n / duration_sec),
        "Flow IAT Mean": float(flow_iat_mean),
        "Flow IAT Std": float(flow_iat_std),
        "Flow IAT Max": float(flow_iat_max),
        "Flow IAT Min": float(flow_iat_min),
        "Fwd IAT Total": float(fwd_iat_tot),
        "Fwd IAT Mean": float(fwd_iat_mean),
        "Fwd IAT Std": float(fwd_iat_std),
        "Fwd IAT Max": float(fwd_iat_max),
        "Fwd IAT Min": float(fwd_iat_min),
        "Bwd IAT Total": float(bwd_iat_tot),
        "Bwd IAT Mean": float(bwd_iat_mean),
        "Bwd IAT Std": float(bwd_iat_std),
        "Bwd IAT Max": float(bwd_iat_max),
        "Bwd IAT Min": float(bwd_iat_min),
        "Fwd PSH Flags": float(flow.get("fwd_psh", 0)),
        "Bwd PSH Flags": float(flow.get("bwd_psh", 0)),
        "Fwd URG Flags": float(flow.get("fwd_urg", 0)),
        "Bwd URG Flags": float(flow.get("bwd_urg", 0)),
        "Fwd Header Length": float(flow.get("fwd_header_len", fwd_n * 20)),
        "Bwd Header Length": float(flow.get("bwd_header_len", bwd_n * 20)),
        "Fwd Packets/s": float(fwd_n / duration_sec),
        "Bwd Packets/s": float(bwd_n / duration_sec),
        "Packet Length Min": float(min(all_lens)) if all_lens else 0.0,
        "Packet Length Max": float(max(all_lens)) if all_lens else 0.0,
        "Packet Length Mean": float(np.mean(all_lens)) if all_lens else 0.0,
        "Packet Length Std": float(np.std(all_lens)) if len(all_lens) > 1 else 0.0,
        "Packet Length Variance": float(np.var(all_lens)) if len(all_lens) > 1 else 0.0,
        "FIN Flag Count": float(flags.get("fin", 0)),
        "SYN Flag Count": float(flags.get("syn", 0)),
        "RST Flag Count": float(flags.get("rst", 0)),
        "PSH Flag Count": float(flags.get("psh", 0)),
        "ACK Flag Count": float(flags.get("ack", 0)),
        "URG Flag Count": float(flags.get("urg", 0)),
        "CWE Flag Count": float(flags.get("cwe", 0)),
        "ECE Flag Count": float(flags.get("ece", 0)),
        "Down/Up Ratio": float(bwd_n / max(fwd_n, 1)),
        "Avg Packet Size": float(all_b / max(all_n, 1)),
        "Avg Fwd Segment Size": float(fwd_b / max(fwd_n, 1)),
        "Avg Bwd Segment Size": float(bwd_b / max(bwd_n, 1)),
        "Fwd Avg Bytes/Bulk": 0.0,
        "Fwd Avg Packets/Bulk": 0.0,
        "Fwd Avg Bulk Rate": 0.0,
        "Bwd Avg Bytes/Bulk": 0.0,
        "Bwd Avg Packets/Bulk": 0.0,
        "Bwd Avg Bulk Rate": 0.0,
        "Subflow Fwd Packets": float(fwd_n),
        "Subflow Fwd Bytes": float(fwd_b),
        "Subflow Bwd Packets": float(bwd_n),
        "Subflow Bwd Bytes": float(bwd_b),
        "Init Fwd Win Bytes": float(flow.get("init_fwd_win", 0)),
        "Init Bwd Win Bytes": float(flow.get("init_bwd_win", 0)),
        "Fwd Act Data Packets": float(fwd_n),
        "Fwd Seg Size Min": float(min(fwd)) if fwd else 0.0,
        "Active Mean": 0.0,
        "Active Std": 0.0,
        "Active Max": 0.0,
        "Active Min": 0.0,
        "Idle Mean": 0.0,
        "Idle Std": 0.0,
        "Idle Max": 0.0,
        "Idle Min": 0.0,
    }

    if cols:
        ordered_row = [feat.get(c, 0.0) for c in cols]
        return pd.DataFrame([ordered_row], columns=cols)
    return pd.DataFrame([list(feat.values())], columns=list(feat.keys()))

def predict(features: pd.DataFrame):
    loaded = _load_artifacts()

    if loaded and _session is not None and _scaler is not None:
        try:
            scaled = _scaler.transform(features).astype(np.float32)
            outputs = _session.run([_output_name], {_input_name: scaled})[0]
            logits = outputs[0]

            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            pred_idx = int(np.argmax(probs))
            confidence = float(probs[pred_idx])

            label = _class_names[pred_idx] if pred_idx < len(_class_names) else "Unknown"
            return label, confidence
        except Exception as exc:
            print(f"[Engine] ONNX Inference error: {exc}. Falling back to heuristic.")

    try:
        flow_bytes_s = float(features.get("Flow Bytes/s", pd.Series([0])).iloc[0])
        flow_pkt_s = float(features.get("Flow Packets/s", pd.Series([0])).iloc[0])
        if flow_pkt_s > 500 or flow_bytes_s > 1_000_000:
            return "DDoS", 0.88
        if flow_pkt_s > 100:
            return "PortScan", 0.82
    except Exception:
        pass

    return "Benign", 0.95

_CRITICAL = {"ddos", "heartbleed", "bot"}
_HIGH = {"dos", "brute force", "sql injection", "infiltration", "patator"}
_MEDIUM = {"portscan", "scan", "xss", "slowhttptest", "slowloris"}

def get_severity(label: str) -> str:
    lower = label.strip().lower()
    if lower in NORMAL_LABELS:
        return "None"
    if any(k in lower for k in _CRITICAL):
        return "Critical"
    if any(k in lower for k in _HIGH):
        return "High"
    if any(k in lower for k in _MEDIUM):
        return "Medium"
    return "Medium"

def is_benign(label: str) -> bool:
    return label.strip().lower() in NORMAL_LABELS
