import React from "react";
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  Settings,
  Radio,
  Play,
  Square,
  Cpu,
  X,
} from "lucide-react";

export default function Sidebar({
  activeTab,
  setActiveTab,
  isMonitoring,
  onToggleMonitoring,
  isTogglingMonitoring = false,
  toggleAction = "",
  isOpen,
  onClose,
  packetCount = 0,
  sessionPackets = 0,
  totalPackets = 0,
  alertCount = 0,
  blockedIpCount = 0,
}) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "traffic", label: "Live Traffic", icon: Activity },
    { id: "alerts", label: "Alerts & Response", icon: ShieldAlert },
    { id: "settings", label: "NIDS Settings", icon: Settings },
  ];

  return (
    <>

      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#030508]/98 border-r border-cyan-500/20 backdrop-blur-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-[10px_0_30px_rgba(0,0,0,0.9)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>

          <div className="h-16 px-4 border-b border-cyan-500/20 flex items-center justify-between bg-[#050810]/70">
            <div className="flex items-center gap-2.5 select-none">
              <div className="shrink-0">
                <img
                  src="/logo.png"
                  alt="CyberPulse Logo"
                  className="w-9 h-9 rounded-none object-cover border border-cyan-400/50"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 text-sm font-orbitron leading-none">
                  CYBERPULSE
                </span>
                <span className="text-slate-500 font-orbitron text-[8.5px] tracking-widest uppercase font-semibold mt-1">
                  INTRUSION DETECTION SYSTEM
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all font-mono cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.25)] font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#070c16] hover:border hover:border-cyan-500/15"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? "text-cyan-400 drop-shadow-[0_0_6px_#00f0ff]"
                        : "text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.id === "alerts" && alertCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.2 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-mono font-bold shadow-[0_0_6px_rgba(255,0,85,0.3)]">
                      {alertCount}
                    </span>
                  )}
                  {item.id === "firewall" && blockedIpCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold">
                      {blockedIpCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-cyan-500/20 bg-[#050810]/70 space-y-3">

          <div className="p-3 rounded-xl bg-[#070b14] border border-cyan-500/25 space-y-2.5 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>NIDS Sniffer</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isMonitoring
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(0,255,157,0.3)]"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {isMonitoring && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 cyber-pulse-dot"></span>
                )}
                {isMonitoring ? "CAPTURING" : "STOPPED"}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Status:</span>
              <span
                className={
                  isMonitoring ? "text-emerald-400 font-bold" : "text-slate-500"
                }
              >
                {isMonitoring ? "Listening (Active)" : "Idle (Standby)"}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-cyan-500/15">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  {isMonitoring && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                  {isMonitoring ? "Live Packets:" : "Session Packets:"}
                </span>
                <span className={`font-bold font-mono ${isMonitoring ? "text-emerald-400" : "text-cyan-300"}`}>
                  {(isMonitoring ? packetCount : Math.max(packetCount, sessionPackets)).toLocaleString()}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Total Ingested:</span>
                <span className="text-cyan-300 font-bold font-mono">
                  {Math.max(totalPackets, packetCount).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={onToggleMonitoring}
              disabled={isTogglingMonitoring}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg ${
                isTogglingMonitoring
                  ? "bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed opacity-75"
                  : isMonitoring
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 shadow-[0_0_12px_rgba(255,0,85,0.25)] cursor-pointer"
                  : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.35)] cursor-pointer"
              }`}
            >
              {isTogglingMonitoring ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {toggleAction === "stopping" ? "STOPPING..." : "STARTING..."}
                </>
              ) : isMonitoring ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  STOP MONITORING
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  START MONITORING
                </>
              )}
            </button>
          </div>

          <div className="px-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1 text-cyan-400">
              <Cpu className="w-3 h-3" />
              NIDS ENGINE READY
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
