import React, { useState } from 'react';
import {
  Search,
  ShieldAlert,
  Check,
  Clock,
  CheckCheck,
  Trash2,
  Ban,
  ShieldCheck,
  PlusCircle,
  Download,
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';

export default function AlertTable({
  alerts = [],
  onResolve,
  onResolveAll,
  onUpdateAlertStatus,
  onDeleteAlert,
  onClearResolved,
  onClearAll,
  onBlockIp,
  onWhitelistIp,
  onCreateRuleFromAlert,
  onSimulateAttack,
  isLoading = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (alert.status && alert.status.toUpperCase().replace(/\s+/g, '_') === statusFilter);

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (alert.attack_type && alert.attack_type.toLowerCase().includes(term)) ||
      (alert.source_ip && alert.source_ip.toLowerCase().includes(term)) ||
      (alert.destination_ip && alert.destination_ip.toLowerCase().includes(term)) ||
      (alert.severity && alert.severity.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const unresolvedCount = alerts.filter((a) => a.status === 'Unresolved').length;
  const resolvedCount = alerts.filter((a) => a.status === 'Resolved' || a.status === 'Mitigated').length;

  const handleExportCsv = () => {
    const headers = ['ID', 'Attack_Type', 'Severity', 'Source_IP', 'Target_IP', 'Status', 'Timestamp', 'Description'];
    const rows = filteredAlerts.map((a) => [
      a.id,
      `"${a.attack_type}"`,
      a.severity,
      a.source_ip,
      a.destination_ip,
      a.status,
      a.timestamp,
      `"${a.description || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `cyberpulse_alerts_log_${Date.now()}.csv`);
    link.click();
  };

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-[#070a10]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col font-mono text-xs">

      <div className="p-4 sm:p-5 border-b border-cyan-500/15 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#080d16]/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(255,0,85,0.25)]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                THREAT INCIDENT LOG
              </h3>
              {unresolvedCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                  {unresolvedCount} Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Active intrusion detections with 1-click mitigation actions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          {unresolvedCount > 0 && onResolveAll && (
            <button
              onClick={onResolveAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold transition-all cursor-pointer"
              title="Resolve all pending alerts"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Resolve All
            </button>
          )}

          {resolvedCount > 0 && onClearResolved && (
            <button
              onClick={onClearResolved}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1322] border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Clear resolved alerts from queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Resolved
            </button>
          )}

          {alerts.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1322] border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition-all cursor-pointer"
              title="Clear all alerts from log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1322] border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
            title="Export alerts as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              placeholder="Search threat, IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#030508] border border-cyan-500/30 rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div className="inline-flex rounded-xl bg-[#030508] p-1 border border-cyan-500/20 text-xs">
            {['ALL', 'UNRESOLVED', 'RESOLVED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-rose-500 text-white font-bold shadow-[0_0_8px_#ff0055]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#030508]/80 text-cyan-400/80 border-b border-cyan-500/15">
              <th className="py-3 px-4 font-semibold">ATTACK SIGNATURE</th>
              <th className="py-3 px-4 font-semibold">SEVERITY</th>
              <th className="py-3 px-4 font-semibold">SOURCE IP</th>
              <th className="py-3 px-4 font-semibold">TARGET</th>
              <th className="py-3 px-4 font-semibold">STATUS</th>
              <th className="py-3 px-4 font-semibold">TIMESTAMP</th>
              <th className="py-3 px-4 font-semibold text-right">TRIAGE CONTROLS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-slate-300">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-rose-500/5 transition-colors group"
                >
                  <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#ff0055]"></span>
                      <span className="group-hover:text-rose-300 transition-colors">
                        {alert.attack_type}
                      </span>
                    </div>
                    {alert.description && (
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5 truncate max-w-xs">
                        {alert.description}
                      </p>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <SeverityBadge severity={alert.severity} />
                  </td>

                  <td className="py-3 px-4 text-cyan-300 whitespace-nowrap font-bold">
                    {alert.source_ip}
                  </td>

                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {alert.destination_ip || '10.0.0.1'}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
                      value={alert.status || 'Unresolved'}
                      onChange={(e) => onUpdateAlertStatus && onUpdateAlertStatus(alert.id, e.target.value)}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-bold focus:outline-none cursor-pointer ${
                        alert.status === 'Resolved' || alert.status === 'Mitigated'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : alert.status === 'Investigating'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : alert.status === 'False Positive'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <option value="Unresolved" className="bg-[#070b14] text-rose-400">Unresolved</option>
                      <option value="Investigating" className="bg-[#070b14] text-amber-400">Investigating</option>
                      <option value="False Positive" className="bg-[#070b14] text-blue-400">False Positive</option>
                      <option value="Resolved" className="bg-[#070b14] text-emerald-400">Mitigated / Resolved</option>
                    </select>
                  </td>

                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Live'}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">

                    {onBlockIp && (
                      <button
                        onClick={() => onBlockIp(alert.source_ip, `Quarantined from incident: ${alert.attack_type}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Block Attacker IP in Firewall"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onWhitelistIp && (
                      <button
                        onClick={() => onWhitelistIp(alert.source_ip, `Whitelisted from alert: ${alert.attack_type}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                        title="Add to Trusted Whitelist (Mark as False Positive)"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onCreateRuleFromAlert && (
                      <button
                        onClick={() => onCreateRuleFromAlert(alert)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                        title="Create Signature Rule for this Threat"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {alert.status !== 'Resolved' && alert.status !== 'Mitigated' && (
                      <button
                        onClick={() => onResolve && onResolve(alert.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                        title="Mark as Mitigated"
                      >
                        <Check className="w-3 h-3" />
                        Resolve
                      </button>
                    )}

                    {onDeleteAlert && (
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Alert Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No alerts found matching current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[#030508]/80 border-t border-cyan-500/15 text-xs text-slate-400 flex items-center justify-between">
        <span>Displaying {filteredAlerts.length} security alerts</span>
      </div>
    </div>
  );
}
