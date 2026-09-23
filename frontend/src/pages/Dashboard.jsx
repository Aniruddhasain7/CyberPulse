import React from 'react';
import {
  Activity,
  ShieldAlert,
  Radio,
  Play,
  Square,
  Flame,
  Ban,
  Network,
} from 'lucide-react';
import { TrafficChart, AttackChart } from '../components/Charts';
import TrafficTable from '../components/TrafficTable';
import AlertTable from '../components/AlertTable';

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  colorScheme = 'cyan',
}) {
  const colorMap = {
    cyan: {
      gradient: 'from-cyan-950/30 via-[#070b14] to-[#04060a]',
      border: 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]',
    },
    amber: {
      gradient: 'from-amber-950/30 via-[#070b14] to-[#04060a]',
      border: 'border-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    },
    emerald: {
      gradient: 'from-emerald-950/30 via-[#070b14] to-[#04060a]',
      border: 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    },
    purple: {
      gradient: 'from-purple-950/30 via-[#070b14] to-[#04060a]',
      border: 'border-purple-500/30 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
    },
    rose: {
      gradient: 'from-rose-950/30 via-[#070b14] to-[#04060a]',
      border: 'border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
    },
  };

  const scheme = colorMap[colorScheme] || colorMap.cyan;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${scheme.border} bg-linear-to-br ${scheme.gradient} p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)]`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-orbitron">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${scheme.iconBg}`}>
            <Icon className="w-4 h-4 stroke-[2.2]" />
          </div>
        )}
      </div>

      <div className="text-3xl font-extrabold font-orbitron tracking-tight text-white mb-1.5 drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
        {value}
      </div>

      {subtitle && (
        <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 font-mono">
          {trend === 'live' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></span>
            </span>
          )}
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({
  stats,
  trafficFlows = [],
  alerts = [],
  attackBreakdown = [],
  isMonitoring,
  sessionPackets = 0,
  isTogglingMonitoring = false,
  toggleAction = '',
  onToggleMonitoring,
  onResolveAlert,
  onResolveAll,
  onNavigateTab,
  onSimulateAttack,
  onBlockIp,
  onWhitelistIp,
  detectionMode = 'IPS',
  onToggleDetectionMode,
  captureInterface = 'default',
  onChangeInterface,
  blockedCount = 2,
  whitelistCount = 3,
}) {
  const unresolvedAlertsCount = alerts.filter((a) => a.status === 'Unresolved').length;

  return (
    <div className="space-y-6">

      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#070b14]/90 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-wider transition-colors ${
                  isTogglingMonitoring
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : isMonitoring
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isTogglingMonitoring ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                ) : isMonitoring ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 cyber-pulse-dot"></span>
                ) : null}
                {isTogglingMonitoring
                  ? toggleAction === 'stopping' ? 'STOPPING...' : 'STARTING...'
                  : isMonitoring ? 'CAPTURE ACTIVE' : 'CAPTURE STOPPED'}
              </span>

              <span className="px-2.5 py-1 rounded-full bg-[#030508] border border-cyan-500/25 text-cyan-300 text-[11px]">
                MODE: {detectionMode === 'IPS' ? 'ACTIVE IPS (DROP)' : 'PASSIVE IDS (ALERT)'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide font-mono">
              INTRUSION DETECTION SYSTEM DASHBOARD
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Real-time deep packet inspection with automated rule-based signature matching and anomaly detection.
              {isMonitoring
                ? ` Capturing socket ingress on interface ${captureInterface}.`
                : ' Capture engine is idle. Click Start Capture below to begin monitoring.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onToggleMonitoring}
                disabled={isTogglingMonitoring}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-lg select-none ${
                  isTogglingMonitoring
                    ? 'opacity-80 cursor-wait bg-slate-800 text-slate-300 border border-slate-700 shadow-none'
                    : isMonitoring
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-400 shadow-[0_0_15px_rgba(255,0,85,0.3)] active:scale-95 cursor-pointer'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.45)] active:scale-95 cursor-pointer'
                }`}
              >
                {isTogglingMonitoring ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                    {toggleAction === 'stopping' ? 'STOPPING CAPTURE...' : 'STARTING CAPTURE...'}
                  </>
                ) : isMonitoring ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    STOP CAPTURE
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    START CAPTURE
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#030508] border border-cyan-500/30 text-xs font-mono">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">NIC:</span>
                <select
                  value={captureInterface}
                  onChange={(e) => onChangeInterface && onChangeInterface(e.target.value)}
                  className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="default" className="bg-[#070b14] text-white">Default Adapter</option>
                  <option value="Ethernet" className="bg-[#070b14] text-white">Ethernet</option>
                  <option value="Wi-Fi" className="bg-[#070b14] text-white">Wi-Fi</option>
                  <option value="Loopback" className="bg-[#070b14] text-white">Loopback (127.0.0.1)</option>
                </select>
              </div>

              {onToggleDetectionMode && (
                <button
                  onClick={onToggleDetectionMode}
                  className="px-3 py-2 rounded-xl bg-[#030508] border border-cyan-500/30 text-xs font-mono text-cyan-300 hover:text-white font-bold transition-all cursor-pointer"
                  title="Switch between inline active blocking (IPS) and passive alerting (IDS)"
                >
                  {detectionMode === 'IPS' ? 'Switch to IDS Mode' : 'Switch to IPS Mode'}
                </button>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#030508] border border-cyan-500/30 w-full lg:w-auto space-y-2.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-rose-400" />
              Threat Injection Sandbox:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSimulateAttack && onSimulateAttack('SYN_FLOOD')}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400 text-xs font-mono font-bold transition-all active:scale-95 shadow-[0_0_8px_rgba(255,0,85,0.2)] cursor-pointer"
              >
                + SYN Flood
              </button>
              <button
                onClick={() => onSimulateAttack && onSimulateAttack('PORT_SCAN')}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 text-xs font-mono font-bold transition-all active:scale-95 shadow-[0_0_8px_rgba(245,158,11,0.2)] cursor-pointer"
              >
                + Port Scan
              </button>
              <button
                onClick={() => onSimulateAttack && onSimulateAttack('BRUTE_FORCE')}
                className="px-3 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 hover:border-yellow-400 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
              >
                + Brute Force
              </button>
              <button
                onClick={() => onSimulateAttack && onSimulateAttack('SQLI')}
                className="px-3 py-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-300 hover:bg-red-600/25 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
              >
                + SQL Injection
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Monitored Traffic Flows"
          value={stats?.total_traffic ?? trafficFlows.length}
          subtitle="Analyzed packet flows"
          icon={Activity}
          colorScheme="cyan"
          trend="up"
        />

        <StatCard
          title="Active Threat Alerts"
          value={unresolvedAlertsCount}
          subtitle={`${unresolvedAlertsCount} incidents requiring attention`}
          icon={ShieldAlert}
          colorScheme="rose"
          trend="warning"
        />

        <StatCard
          title="Blocked Malicious IPs"
          value={blockedCount}
          subtitle={`${whitelistCount} whitelisted endpoints`}
          icon={Ban}
          colorScheme="amber"
          trend="down"
        />

        <StatCard
          title="Packet Capture State"
          value={isMonitoring ? 'CAPTURING' : 'STOPPED'}
          subtitle={`NIC: ${captureInterface}`}
          icon={Radio}
          colorScheme={isMonitoring ? 'emerald' : 'amber'}
          trend={isMonitoring ? 'live' : 'offline'}
        />
      </div>

      <div>
        <TrafficChart isLive={isMonitoring} flows={trafficFlows} sessionPackets={sessionPackets} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AttackChart data={attackBreakdown} />
        </div>

        <div className="lg:col-span-2">
          <AlertTable
            alerts={alerts.slice(0, 8)}
            onResolve={onResolveAlert}
            onResolveAll={onResolveAll}
            onBlockIp={onBlockIp}
            onWhitelistIp={onWhitelistIp}
            onSimulateAttack={() => onSimulateAttack && onSimulateAttack('SYN_FLOOD')}
          />
        </div>
      </div>

      <div>
        <TrafficTable
          flows={trafficFlows.slice(0, 15)}
          onBlockIp={onBlockIp}
          onWhitelistIp={onWhitelistIp}
        />
      </div>
    </div>
  );
}
