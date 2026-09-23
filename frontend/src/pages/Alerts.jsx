import React from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import AlertTable from '../components/AlertTable';
import { AttackChart } from '../components/Charts';

export default function Alerts({
  alerts = [],
  attackBreakdown = [],
  onResolveAlert,
  onResolveAll,
  onUpdateAlertStatus,
  onDeleteAlert,
  onClearResolved,
  onClearAll,
  onBlockIp,
  onWhitelistIp,
  onCreateRuleFromAlert,
  onRefresh,
  isRefreshing,
  onSimulateAttack,
}) {
  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;
  const highCount = alerts.filter((a) => a.severity === 'High').length;
  const mediumCount = alerts.filter((a) => a.severity === 'Medium').length;
  const resolvedCount = alerts.filter((a) => a.status === 'Resolved' || a.status === 'Mitigated').length;

  return (
    <div className="space-y-6 font-mono text-xs">

      <div className="p-5 rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white tracking-wide">
                INTRUSION THREAT INCIDENT QUEUE
              </h2>
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#ff0055]"></span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-sans">
              Review threat alerts, isolate attacker IPs with 1 click, whitelist false positives, or create signature rules directly from incidents.
            </p>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b1322] hover:bg-[#111c33] text-cyan-300 border border-cyan-500/30 font-semibold transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="pt-3 border-t border-cyan-500/15 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            Threat Sandbox:
          </span>

          <button
            onClick={() => onSimulateAttack && onSimulateAttack('SYN_FLOOD')}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
          >
            + SYN Flood
          </button>

          <button
            onClick={() => onSimulateAttack && onSimulateAttack('PORT_SCAN')}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
          >
            + Port Scan
          </button>

          <button
            onClick={() => onSimulateAttack && onSimulateAttack('BRUTE_FORCE')}
            className="px-2.5 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
          >
            + SSH Brute Force
          </button>

          <button
            onClick={() => onSimulateAttack && onSimulateAttack('PING_SWEEP')}
            className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
          >
            + Ping Sweep
          </button>

          <button
            onClick={() => onSimulateAttack && onSimulateAttack('SQLI')}
            className="px-2.5 py-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-300 hover:bg-red-600/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
          >
            + SQL Injection
          </button>

          <button
            onClick={() => onSimulateAttack && onSimulateAttack('DNS_AMP')}
            className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
          >
            + DNS Amplification
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(255,0,85,0.15)]">
          <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Severity</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#ff0055]"></span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{criticalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">DDoS & Exploits</p>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/30 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>High Severity</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]"></span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{highCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Reconnaissance Probes</p>
        </div>

        <div className="p-4 rounded-2xl border border-yellow-500/30 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(234,179,8,0.15)]">
          <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center justify-between">
            <span>Medium Severity</span>
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{mediumCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Auth Failures & Anomalies</p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,255,157,0.15)]">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Mitigated / Resolved</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#00ff9d]"></span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{resolvedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Resolved Incident Records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AttackChart data={attackBreakdown} />
        </div>

        <div className="lg:col-span-2">
          <AlertTable
            alerts={alerts}
            onResolve={onResolveAlert}
            onResolveAll={onResolveAll}
            onUpdateAlertStatus={onUpdateAlertStatus}
            onDeleteAlert={onDeleteAlert}
            onClearResolved={onClearResolved}
            onClearAll={onClearAll}
            onBlockIp={onBlockIp}
            onWhitelistIp={onWhitelistIp}
            onCreateRuleFromAlert={onCreateRuleFromAlert}
            onSimulateAttack={() => onSimulateAttack && onSimulateAttack('SYN_FLOOD')}
            isLoading={isRefreshing}
          />
        </div>
      </div>
    </div>
  );
}
