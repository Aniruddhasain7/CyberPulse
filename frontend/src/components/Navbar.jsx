import React, { useState, useEffect } from "react";
import {
  Menu,
  RefreshCw,
  Bell,
  Server,
  Zap,
  Clock,
  Check,
  CheckCheck,
  ShieldCheck,
  ExternalLink,
  Play,
  Square,
} from "lucide-react";
import SeverityBadge from "./SeverityBadge";

export default function Navbar({
  pageTitle = "Dashboard",
  onMenuClick,
  backendStatus = "standby",
  onRefresh,
  isRefreshing = false,
  alertCount = 0,
  alerts = [],
  onResolveAlert,
  onResolveAll,
  onSimulateAttack,
  onNavigateTab,
  isMonitoring = false,
  onToggleMonitoring,
  isTogglingMonitoring = false,
  toggleAction = "",
}) {
  const [timeStr, setTimeStr] = useState("");
  const [useLocalTime, setUseLocalTime] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [threatMenuOpen, setThreatMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (useLocalTime) {
        setTimeStr(
          now.toLocaleTimeString("en-US", { hour12: false }) + " Local",
        );
      } else {
        setTimeStr(now.toLocaleTimeString("en-US", { hour12: false }) + " UTC");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [useLocalTime]);

  useEffect(() => {
    const handleDocClick = () => {
      setNotificationsOpen(false);
      setThreatMenuOpen(false);
    };
    if (notificationsOpen || threatMenuOpen) {
      document.addEventListener("click", handleDocClick);
    }
    return () => document.removeEventListener("click", handleDocClick);
  }, [notificationsOpen, threatMenuOpen]);

  const unresolvedAlerts = alerts.filter((a) => a.status === "Unresolved");
  const recentAlerts = alerts.slice(0, 6);

  return (
    <header className="h-16 border-b border-cyan-500/20 bg-[#030508]/90 backdrop-blur-2xl sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.8)] font-mono">

      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-[#070c16] border border-cyan-500/20 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="CyberPulse Logo"
            className="w-8 h-8 rounded-none object-cover border border-cyan-400/50 lg:hidden"
          />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide font-orbitron flex items-center gap-2">
              <span>{pageTitle.toUpperCase()}</span>
            </h1>
            <p className="text-[10px] text-cyan-400/80 font-orbitron tracking-wider hidden sm:block">
              CYBERPULSE • INTRUSION DETECTION SYSTEM
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">

        <button
          onClick={() => setUseLocalTime(!useLocalTime)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#060a12] border border-cyan-500/20 text-xs text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer"
          title={`Click to switch between UTC and Local time (currently: ${useLocalTime ? "Local" : "UTC"})`}
        >
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{timeStr || "00:00:00 UTC"}</span>
        </button>

        {onToggleMonitoring && (
          <button
            onClick={onToggleMonitoring}
            disabled={isTogglingMonitoring}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shadow-sm select-none ${
              isTogglingMonitoring
                ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-wait opacity-80"
                : isMonitoring
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-400 shadow-[0_0_10px_rgba(255,0,85,0.25)] cursor-pointer active:scale-95"
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.2)] cursor-pointer active:scale-95"
            }`}
            title={isMonitoring ? "Click to Stop Packet Capture" : "Click to Start Packet Capture"}
          >
            {isTogglingMonitoring ? (
              <>
                <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                <span className="hidden md:inline">
                  {toggleAction === "stopping" ? "STOPPING..." : "STARTING..."}
                </span>
              </>
            ) : isMonitoring ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="hidden sm:inline">STOP SNIFFER</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current text-cyan-400" />
                <span className="hidden sm:inline">START SNIFFER</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#060a12] border border-cyan-500/20 text-xs hover:border-cyan-400 transition-colors cursor-pointer"
          title="Engine status - click to ping backend"
        >
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 hidden sm:inline">Engine:</span>
          {backendStatus === "connected" ? (
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#00ff9d]"></span>
              ONLINE
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              OFFLINE
            </span>
          )}
        </button>

        {onSimulateAttack && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setThreatMenuOpen(!threatMenuOpen);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-300 hover:text-white hover:border-rose-400 hover:shadow-[0_0_15px_rgba(255,0,85,0.3)] text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="Select and inject simulated cyber threat"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Inject Threat</span>
            </button>

            {threatMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-52 bg-[#070a10]/98 border border-rose-500/40 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.95)] overflow-hidden z-50 text-xs animate-popIn backdrop-blur-2xl p-1.5 space-y-1 font-mono"
              >
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-rose-500/20">
                  Select Attack Vector
                </div>
                {[
                  { id: "SYN_FLOOD", label: "SYN Flood DDoS", color: "text-rose-400" },
                  { id: "PORT_SCAN", label: "TCP Port Recon", color: "text-amber-400" },
                  { id: "BRUTE_FORCE", label: "SSH Brute Force", color: "text-yellow-400" },
                  { id: "SQLI", label: "SQL Injection", color: "text-red-400" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setThreatMenuOpen(false);
                      onSimulateAttack(item.id);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-rose-500/15 transition-all text-left text-xs cursor-pointer group"
                  >
                    <span>{item.label}</span>
                    <span className={`text-[10px] font-bold ${item.color}`}>+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Telemetry Data"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-[#070c16] border border-cyan-500/20 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`}
            />
          </button>
        )}

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNotificationsOpen(!notificationsOpen);
            }}
            className={`p-2 rounded-xl transition-all relative cursor-pointer ${
              notificationsOpen
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                : "text-slate-400 hover:text-white hover:bg-[#070c16] border border-cyan-500/20"
            }`}
            title={`${unresolvedAlerts.length} active threat notifications`}
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unresolvedAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-[0_0_10px_#ff0055]">
                {unresolvedAlerts.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#070a10]/98 border border-cyan-500/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden z-50 text-xs animate-popIn backdrop-blur-2xl"
            >

              <div className="p-3.5 border-b border-cyan-500/20 bg-[#090e18] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white uppercase tracking-wider">
                    THREAT NOTIFICATIONS
                  </span>
                  {unresolvedAlerts.length > 0 && (
                    <span className="px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold">
                      {unresolvedAlerts.length} New
                    </span>
                  )}
                </div>

                {unresolvedAlerts.length > 0 && onResolveAll && (
                  <button
                    onClick={() => onResolveAll()}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
                    title="Mark all alerts resolved"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Resolve All</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {recentAlerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                    <p className="font-bold text-white">All Systems Secure</p>
                    <p className="text-[11px] text-slate-500">
                      No intrusion anomalies or threat alerts detected.
                    </p>
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setNotificationsOpen(false);
                        if (onNavigateTab) onNavigateTab("alerts");
                      }}
                      className="p-3 hover:bg-cyan-500/5 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              alert.status === "Resolved" ||
                              alert.status === "Mitigated"
                                ? "bg-emerald-400"
                                : "bg-rose-500 shadow-[0_0_6px_#ff0055]"
                            }`}
                          ></span>
                          <span className="font-bold text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                            {alert.attack_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <SeverityBadge severity={alert.severity} />
                          <span className="text-cyan-300">
                            {alert.source_ip}
                          </span>
                          <span>•</span>
                          <span>
                            {alert.timestamp
                              ? new Date(alert.timestamp).toLocaleTimeString()
                              : "Recent"}
                          </span>
                        </div>
                      </div>

                      {alert.status !== "Resolved" &&
                        alert.status !== "Mitigated" &&
                        onResolveAlert && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onResolveAlert(alert.id);
                            }}
                            className="p-1 rounded bg-[#0b1322] border border-slate-700 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer shrink-0"
                            title="Mark resolved"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-[#05070e] border-t border-cyan-500/15 flex items-center justify-between">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    if (onNavigateTab) onNavigateTab("alerts");
                  }}
                  className="w-full py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-center font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View All Threat Alerts</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
