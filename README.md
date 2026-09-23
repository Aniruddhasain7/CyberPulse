# CyberPulse — Real-Time Network Intrusion Detection & Prevention System (NIDS/IPS)

<p align="center">
  <img src="frontend/public/logo.png" alt="CyberPulse Logo" width="120" style="border-radius: 12px;"/>
</p>

<p align="center">
  <strong>Next-Generation Deep Learning Network Security Operations Center</strong><br />
  Continuous live packet sniffing, streaming 5-tuple flow reconstruction, real-time 77-feature vector extraction, sub-millisecond multi-class threat classification with ONNX Runtime, and automated IP quarantine containment.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11+" />
  <img src="https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
  <img src="https://img.shields.io/badge/ONNX_Runtime-1.19+-005CED?style=for-the-badge&logo=onnx&logoColor=white" alt="ONNX Runtime" />
  <img src="https://img.shields.io/badge/Scapy-2.7-EC407A?style=for-the-badge&logo=wireshark&logoColor=white" alt="Scapy" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [15 Trained Detection Classes (CIC-IDS2017)](#15-trained-detection-classes-cic-ids2017)
- [77 Extracted Flow Features](#77-extracted-flow-features)
- [Tech Stack](#tech-stack)
- [Project Directory Structure](#project-directory-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Packet Capture Driver & Simulation Fallback](#packet-capture-driver--simulation-fallback)
- [REST API Reference](#rest-api-reference)
- [Threat Simulation Suite](#threat-simulation-suite)
- [Environment Variables Configuration](#environment-variables-configuration)
- [License](#license)

---

## Overview

**CyberPulse** is an enterprise-grade, full-stack **Network Intrusion Detection and Prevention System (NIDS/IPS)**. Traditional signature-based systems (e.g., legacy Snort/Suricata rules) struggle against zero-day exploits, evasive polymorphic payloads, and novel volumetric anomalies. CyberPulse overcomes this by pairing continuous raw packet ingress with a deep neural network trained on the benchmark **CIC-IDS2017** dataset.

As packets arrive over a physical network interface or virtual adapter, CyberPulse:
1. Reassembles packets into bidirectional **5-tuple network conversations** (`Source IP`, `Dest IP`, `Source Port`, `Dest Port`, `Protocol`).
2. Calculates a statistical **77-dimensional feature vector** across forward and backward segments (inter-arrival times, byte distributions, TCP flags, window scales).
3. Standardizes and evaluates the vector via an optimized **ONNX Runtime engine** in sub-millisecond inference passes.
4. Executes proactive containment: alerts security operators in **Passive IDS** mode, or drops traffic and auto-quarantines the hostile IP in **Active IPS** mode.
5. Streams telemetry to a responsive, cyberpunk-themed **React 19 Security Operations Center (SOC)** dashboard with live SVG throughput metrics, an AI Attack Matrix, and granular packet inspection modals.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Ingress["Packet Ingress & Flow Assembly"]
        NIC["Physical / Virtual NIC (Scapy Driver)"]
        SIM["Continuous Synthetic Stream Fallback"]
        NIC --> CAP["Packet Capture Worker"]
        SIM --> CAP
        CAP --> BLK_CHECK{"Source IP Quarantined?"}
        BLK_CHECK -- Yes --> SHORT["Drop Packet & Short-Circuit ML"]
        BLK_CHECK -- No --> FB["Streaming 5-Tuple FlowBuilder"]
        FB --> TIMEOUT{"Idle Timeout (5s) or FIN/RST?"}
        TIMEOUT -- Flushing --> FLOW["Completed 5-Tuple Flow"]
    end

    subgraph Detection["Inference & Decision Engine"]
        FLOW --> EXTRACT["77-Feature Vector Extractor"]
        EXTRACT --> SCALE["StandardScaler (scaler.pkl)"]
        SCALE --> ONNX["ONNX Runtime Neural Classifier (nids_model.onnx)"]
        ONNX --> SCORES["Softmax Class Probabilities (15 Classes)"]
        SCORES --> CONF{"Confidence >= Threshold?"}
        CONF -- Benign / Below Threshold --> PASS["Classify as Normal / Log Flow"]
        CONF -- Attack Confirmed --> DECISION{"Enforcement Mode"}
        DECISION -- Passive IDS --> LOG_ALERT["Trigger Alert Event & Record Incident"]
        DECISION -- Active IPS --> AUTO_BLOCK["Quarantine IP + Drop Future Traffic + Record Alert"]
    end

    subgraph Storage["Persistence & Telemetry"]
        SHORT --> DB[("PostgreSQL Database (Neon Serverless)")]
        PASS --> DB
        LOG_ALERT --> DB
        AUTO_BLOCK --> DB
    end

    subgraph Frontend["SOC Dashboard (React 19 + Tailwind v4)"]
        DB --> API["Flask REST Blueprints (/api)"]
        API <--> SOC["CyberPulse Web UI (Dashboard, Traffic, Alerts, Settings)"]
    end
```

---

## Key Features

- **Continuous Live Packet Capture & Streaming Flow Assembly**
  - Raw socket sniffing on configurable network interfaces using Scapy (supports Windows Npcap and Linux libpcap).
  - Streaming bidirectional 5-tuple flow assembler with configurable idle flush timeouts.
  - Generates comprehensive statistics: forward/backward packet counts, length variances, flow duration, and TCP flags (`SYN`, `FIN`, `ACK`, `RST`, `PSH`, `URG`, `ECE`, `CWR`).

- **Sub-Millisecond ONNX Runtime Inference**
  - Deploys a trained 15-class deep neural network via **ONNX Runtime** for high-throughput, low-latency evaluation without heavy framework overhead.
  - Feature normalization handled by an aligned `StandardScaler` pipeline.
  - **Blacklist Short-Circuiting**: Flows from quarantined IPs are immediately flagged and dropped without executing redundant ML forward passes, saving CPU cycles under heavy attack conditions.

- **Dual-Mode Response Policies (IDS vs. IPS)**
  - **Passive IDS Mode**: Continuous classification and threat alerting without interfering with network flow.
  - **Active IPS Mode**: Inline enforcement policy that automatically isolates hostile host IPs into a quarantined blacklist, tracking dropped packet counters.
  - **Dynamic Confidence Tuning**: Adjust classification certainty threshold between `0.50` and `0.99` in real time.
  - **Whitelist Safe-List**: Protect critical gateway routers, DNS servers, and internal IPs from accidental quarantine.

- **High-Fidelity Telemetry Operations Center**
  - **SOC Dashboard**: Real-time KPI counters (active sessions, analyzed flows, threats blocked, engine latency), live SVG network throughput graphs, and an AI Attack Distribution Matrix.
  - **Live Traffic Stream**: Interactive data grid displaying protocol, 5-tuple socket info, byte counts, TCP flag indicators, and deep packet inspector inspection modals.
  - **Alerts & Incident Response**: Filter threats by severity (`Low`, `Medium`, `High`, `Critical`) and resolution status, with single-click IP quarantine and bulk resolution actions.
  - **NIDS Configuration Tab**: Real-time tuning for interface selection, capture idle timeout, detection threshold, promiscuous mode, and factory reset controls.

- **Self-Contained Attack Simulation Suite**
  - Built-in simulation endpoints to test and demonstrate system detection without external offensive tooling:
    - `SYN_FLOOD` (DoS)
    - `PORT_SCAN` (Reconnaissance)
    - `BRUTE_FORCE` (Credential Abuse)
    - `PING_SWEEP` (ICMP Probing)
    - `SQLI` (Web Application Attack)
    - `DNS_AMP` (Volumetric UDP Amplification)

- **Graceful Simulation Fallback**
  - If Npcap or root socket capture permissions are unavailable on the host system, CyberPulse automatically falls back to continuous synthetic packet generation, ensuring full functionality and visualization in any development or staging environment.

---

## 15 Trained Detection Classes (CIC-IDS2017)

CyberPulse classifies incoming flows into 15 distinct categories based on the Canadian Institute for Cybersecurity **CIC-IDS2017** benchmark:

| Category | Attack Signature / Class | Severity | Description |
| :--- | :--- | :--- | :--- |
| **Normal** | `Benign` | Normal | Standard authorized traffic flow within expected baseline statistical parameters |
| **Denial of Service** | `DDoS` | Critical | Volumetric distributed denial of service saturating bandwidth or connection pools |
| | `DoS GoldenEye` | High | HTTP Keep-Alive and Cache-Control exhaustion targeting web server worker pools |
| | `DoS Hulk` | High | Obfuscated dynamic HTTP GET request flood bypassing web application caching |
| | `DoS Slowhttptest` | High | Application-layer slow HTTP request body transmission starving server resources |
| | `DoS slowloris` | High | Low-and-slow partial HTTP header transmission keeping server connections open |
| **Reconnaissance** | `PortScan` | High | Systematic probing across sequential or randomized ports to discover listening services |
| **Credential Attacks** | `SSH-Patator` | Medium | Automated dictionary or brute-force credential stuffing targeting SSH (port 22) |
| | `FTP-Patator` | Medium | High-frequency authentication attempts targeting FTP authentication services |
| **Web Exploitation** | `Web Attack - Brute Force` | High | Automated form-based credential attacks targeting web application login interfaces |
| | `Web Attack - SQL Injection` | Critical | Exploitation attempts inserting malicious SQL payloads into query parameters |
| | `Web Attack - XSS` | Medium | Malicious client-side script injection detected in request parameters or headers |
| **Advanced Threats** | `Bot` | High | Infected endpoint communicating with Command & Control (C2) botnet infrastructure |
| | `Infiltration` | Critical | Post-compromise internal network traversal, pivoting, and unauthorized lateral movement |
| | `Heartbleed` | Critical | Malformed TLS Heartbeat request attempting to leak OpenSSL process memory |

---

## 77 Extracted Flow Features

The `FlowBuilder` and `extract_features` pipeline converts raw packet bursts into the 77 standard statistical network flow features:

- **Flow Identification & Timing**: Flow Duration, Flow Inter-Arrival Times (`Flow IAT Mean`, `Std`, `Max`, `Min`).
- **Forward & Backward Lengths**: Total Fwd/Bwd Packets, Total Length of Fwd/Bwd Packets, Fwd/Bwd Packet Length (`Max`, `Min`, `Mean`, `Std`).
- **Directional Inter-Arrival Times**: `Fwd IAT Total`, `Mean`, `Std`, `Max`, `Min` and `Bwd IAT Total`, `Mean`, `Std`, `Max`, `Min`.
- **Packet Headers & Flag Counters**: Fwd/Bwd Header Length, Fwd/Bwd Packets/s, Flow Bytes/s, Min/Max Packet Length, Packet Length Variance.
- **TCP Control Flags**: `FIN`, `SYN`, `RST`, `PSH`, `ACK`, `URG`, `ECE`, `CWR` flag frequencies and ratios.
- **Down/Up Ratio & Window Sizes**: Down/Up Ratio, Average Packet Size, Avg Fwd/Bwd Segment Size, `Init_Win_bytes_forward`, `Init_Win_bytes_backward`.
- **Sub-Flow Statistics**: Subflow Fwd/Bwd Packets, Subflow Fwd/Bwd Bytes, `act_data_pkt_fwd`, `min_seg_size_forward`.
- **Activity & Idle Intervals**: Active Time (`Mean`, `Std`, `Max`, `Min`) and Idle Time (`Mean`, `Std`, `Max`, `Min`).

---

## Tech Stack

### Backend
- **Language**: Python 3.11+
- **Web Framework**: Flask 3.0, Flask-CORS
- **Database & ORM**: PostgreSQL (Neon Serverless PostgreSQL), Flask-SQLAlchemy 3.1, Psycopg2-binary
- **Machine Learning & Inference**: ONNX Runtime, Scikit-learn, NumPy, Pandas, Joblib
- **Packet Ingress**: Scapy 2.7 (with Npcap support on Windows)
- **WSGI Production**: Gunicorn

### Frontend
- **Framework**: React 19, Vite 8
- **Styling**: Tailwind CSS v4, Custom Cyberpunk Glassmorphism Tokens
- **Icons**: Lucide React
- **Linter**: Oxlint

---

## Project Directory Structure

```
CyberPulse/
├── .gitignore                      # Git exclusion rules (node_modules, venv, secrets, dumps)
├── README.md                       # Complete documentation & quickstart
├── backend/
│   ├── .env.example                # Backend environment configuration template
│   ├── app.py                      # Flask application entry point & blueprint registration
│   ├── config.py                   # Centralized configuration & environment loader
│   ├── models.py                   # SQLAlchemy ORM schemas (TrafficFlow, Alert, BlockedIp, etc.)
│   ├── requirements.txt            # Python package dependencies
│   ├── capture/
│   │   ├── flow_builder.py         # 5-tuple flow assembler & 77-feature extraction logic
│   │   └── packet_capture.py       # Scapy sniffer worker, blacklist short-circuit & simulation fallback
│   ├── database/
│   │   └── connection.py           # SQLAlchemy database instance
│   ├── detection/
│   │   └── engine.py               # ONNX Runtime inference engine & severity evaluator
│   ├── ml/
│   │   ├── nids_model.onnx         # 15-class trained neural network model (ONNX format)
│   │   ├── scaler.pkl              # 77-feature StandardScaler model
│   │   └── nids_training.ipynb     # Training pipeline notebook (CIC-IDS2017 dataset)
│   └── routes/
│       ├── alert_routes.py         # Alert management, resolution, deletion & threat simulation
│       ├── monitoring_routes.py    # Sniffer start, stop, and status polling endpoints
│       ├── system_routes.py        # Dashboard stats, system settings, quarantine & whitelist
│       └── traffic_routes.py       # Live flow telemetry querying & purge endpoints
└── frontend/
    ├── .env.example                # Frontend environment configuration template
    ├── .oxlintrc.json              # Oxlint linting configuration
    ├── index.html                  # HTML5 entry template with Orbitron & Inter fonts
    ├── package.json                # Frontend package dependencies & scripts
    ├── vite.config.js              # Vite dev server configuration & /api reverse proxy
    ├── public/
    │   └── logo.png                # CyberPulse brand logo
    └── src/
        ├── App.jsx                 # Main application controller & state orchestrator
        ├── index.css               # Design tokens, cyber glow effects, and Tailwind v4 themes
        ├── main.jsx                # React DOM entry point
        ├── components/
        │   ├── AlertTable.jsx      # Threat incidents table with quarantine action triggers
        │   ├── Charts.jsx          # SVG throughput telemetry graph & AI Attack Matrix
        │   ├── Navbar.jsx          # Header with live engine status indicator & clock
        │   ├── PacketModal.jsx     # Granular packet inspector modal
        │   ├── SeverityBadge.jsx   # Threat severity visual indicator badge
        │   ├── Sidebar.jsx         # Left navigation bar with quick start/stop controls
        │   └── TrafficTable.jsx    # Real-time traffic flow data table
        ├── pages/
        │   ├── Alerts.jsx          # Threat incidents management view
        │   ├── Dashboard.jsx       # Real-time KPIs, charts, and system status view
        │   ├── Settings.jsx        # NIDS threshold, IPS toggle & NIC configuration view
        │   └── Traffic.jsx         # Live traffic analysis stream & BPF filtering view
        └── services/
            └── api.js              # Unified REST API service wrapper
```

---

## Prerequisites

- **Python**: Version `3.11` or higher
- **Node.js**: Version `18.0.0` or higher (`npm` included)
- **PostgreSQL**: A running PostgreSQL database (e.g. [Neon](https://neon.tech) serverless PostgreSQL or local PostgreSQL instance)
- **Packet Ingress Driver (Optional for Live Sniffing)**:
  - **Windows**: Install [Npcap](https://npcap.com/) (select *"Install Npcap in WinPcap API-compatible Mode"*).
  - **Linux**: Install `libpcap` (e.g., `sudo apt install libpcap-dev`).
  - *Note: If no packet driver is installed or permissions are restricted, CyberPulse runs automatically in continuous synthetic simulation mode.*

---

## Getting Started

### 1. Backend Setup

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend
```

#### Step 1.1: Create and Activate a Virtual Environment

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Step 1.2: Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Step 1.3: Configure Environment Variables

Copy the example environment file and configure your PostgreSQL database connection:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Linux / macOS:**
```bash
cp .env.example .env
```

Open `.env` in your text editor and set your PostgreSQL `DATABASE_URL`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/cyberpulse"
```
*(If using Neon Serverless PostgreSQL, paste your Neon connection string with `?sslmode=require`).*

#### Step 1.4: Launch the Backend Server

```bash
python app.py
```

The Flask API will start at `http://127.0.0.1:5000`. On boot, it automatically initializes database tables, synchronizes settings, and sets up the ONNX inference pipeline.

---

### 2. Frontend Setup

Open a second terminal and navigate to the `frontend/` directory:

```bash
cd frontend
```

#### Step 2.1: Install Dependencies

```bash
npm install
```

#### Step 2.2: Configure Environment (Optional)

By default, Vite proxies all `/api` requests to `http://127.0.0.1:5000`. If running frontend and backend on custom hosts:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Linux / macOS:**
```bash
cp .env.example .env
```

#### Step 2.3: Start the Vite Development Server

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

---

## Packet Capture Driver & Simulation Fallback

CyberPulse is designed to operate seamlessly across both bare-metal production environments and restricted development sandboxes:

1. **Live Interface Sniffing (Production Mode)**:
   - When running with administrative privileges (Administrator on Windows, `root` / `sudo` / `CAP_NET_RAW` on Linux) and Npcap/libpcap installed, CyberPulse captures raw Ethernet frames directly from your selected physical or virtual network interface.
2. **Intelligent Simulation Fallback (Development Mode)**:
   - If the capture driver is absent or administrative access is restricted, the backend logs a warning and automatically initiates continuous synthetic packet generation.
   - Flows are generated with realistic IP ranges, protocol distributions, flag mixes, and packet sizes, giving you full access to live graphs, feature extraction, and ML classification without any setup barriers.

---

## REST API Reference

All API routes are served under the `/api` prefix:

### System & Health

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root service health status check |
| `GET` | `/api/health` | Service liveness probe returning `{ status: "healthy" }` |
| `GET` | `/api/system/dashboard` | Aggregated SOC statistics, throughput rates, recent alerts, model status, and active capture session |
| `DELETE`| `/api/system/logs` | Purge all historical traffic flows and resolved alerts |

### NIDS Configuration & Policies

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/system/settings` | Retrieve active operational settings (thresholds, IPS mode, NIC, idle timeout) |
| `PUT` | `/api/system/settings` | Update runtime settings (`confidenceThreshold`, `autoBlockThreats`, `detectionMode`, etc.) |
| `POST` | `/api/system/settings/reset` | Restore system settings to factory default values |

### Quarantine & Whitelist Controls

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/system/blocked` | List all currently quarantined hostile IP addresses and dropped packet counts |
| `POST` | `/api/system/blocked` | Manually quarantine an IP (`{ ip, reason, packets_dropped }`) |
| `DELETE`| `/api/system/blocked/<ip>` | Release a specific IP from the quarantine blacklist |
| `DELETE`| `/api/system/blocked` | Release all quarantined IP addresses |
| `GET` | `/api/system/whitelist` | List all trusted whitelist IP addresses |
| `POST` | `/api/system/whitelist` | Add an IP to the trusted whitelist (`{ ip, label }`) |
| `DELETE`| `/api/system/whitelist/<ip>` | Remove an IP from the trusted whitelist |
| `DELETE`| `/api/system/whitelist` | Clear all whitelist entries |

### Packet Capture Monitoring

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/monitoring/start` | Start the packet capture worker on a specified interface (`{ interface: "default" }`) |
| `POST` | `/api/monitoring/stop` | Terminate the active capture worker and flush pending flows |
| `GET` | `/api/monitoring/status` | Query capture worker status, runtime duration, and total packets processed |

### Traffic Telemetry

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/traffic` | Retrieve recent network flows (query parameter: `?limit=100`) |
| `DELETE`| `/api/traffic` | Purge stored network flow records |

### Alerts & Threat Incidents

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/alerts` | Query detected alerts (query parameters: `?status=Active&limit=100`) |
| `PATCH`| `/api/alerts/<id>/resolve` | Mark an individual alert incident as resolved |
| `PATCH`| `/api/alerts/<id>` | Update an alert's status (`{ status: "Investigating" }`) |
| `POST` | `/api/alerts/resolve-all` | Mark all pending active alerts as resolved |
| `DELETE`| `/api/alerts/<id>` | Delete an individual alert record |
| `DELETE`| `/api/alerts/resolved` | Purge all resolved alert incidents |
| `DELETE`| `/api/alerts` | Purge all alert records |
| `POST` | `/api/alerts/simulate` | Inject a simulated attack scenario into the detection engine |

---

## Threat Simulation Suite

You can trigger synthetic attack vectors directly from the **Alerts & Response** page in the UI or via standard HTTP requests:

```bash
# Inject a SYN Flood / DoS attack
curl -X POST http://127.0.0.1:5000/api/alerts/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario": "SYN_FLOOD"}'

# Inject an Aggressive Nmap Port Scan
curl -X POST http://127.0.0.1:5000/api/alerts/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario": "PORT_SCAN"}'

# Inject an SSH Password Brute Force
curl -X POST http://127.0.0.1:5000/api/alerts/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario": "BRUTE_FORCE"}'

# Inject an SQL Injection Attempt
curl -X POST http://127.0.0.1:5000/api/alerts/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario": "SQLI"}'

# Inject a DNS Amplification Attack
curl -X POST http://127.0.0.1:5000/api/alerts/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario": "DNS_AMP"}'

# Inject an ICMP Ping Sweep
curl -X POST http://127.0.0.1:5000/api/alerts/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario": "PING_SWEEP"}'
```

---

## Environment Variables Configuration

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection URI (`postgresql://user:pass@host:5432/dbname`) |
| `PYTHONDONTWRITEBYTECODE` | No | `1` | Disables Python bytecode (`.pyc`) generation |
| `MODEL_PATH` | No | `ml/nids_model.onnx` | Relative or absolute path to the ONNX model file |
| `SCALER_PATH` | No | `ml/scaler.pkl` | Relative or absolute path to the StandardScaler `.pkl` file |
| `CAPTURE_IDLE_TIMEOUT` | No | `5` | Inactivity duration (in seconds) before finalizing a 5-tuple flow |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Allowed frontend origin for CORS negotiation |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | No | `""` | Backend URL. When blank, Vite reverse-proxies `/api` to `http://127.0.0.1:5000` |

---

## License

This project is licensed under the [MIT License](LICENSE).
