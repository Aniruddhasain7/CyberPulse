import React, { useState } from 'react';
import { Search, Network, ArrowRight, Download, Eye, Ban, ShieldCheck } from 'lucide-react';
import PacketModal from './PacketModal';

export default function TrafficTable({
  flows = [],
  onRefresh,
  isLoading = false,
  onBlockIp,
  onWhitelistIp,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProto, setSelectedProto] = useState('ALL');
  const [selectedFlow, setSelectedFlow] = useState(null);

  const filteredFlows = flows.filter((flow) => {
    const matchesProto =
      selectedProto === 'ALL' ||
      (flow.protocol && flow.protocol.toUpperCase() === selectedProto);

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (flow.source_ip && flow.source_ip.toLowerCase().includes(term)) ||
      (flow.destination_ip && flow.destination_ip.toLowerCase().includes(term)) ||
      String(flow.source_port).includes(term) ||
      String(flow.destination_port).includes(term) ||
      (flow.protocol && flow.protocol.toLowerCase().includes(term)) ||
      (flow.status && flow.status.toLowerCase().includes(term));

    return matchesProto && matchesSearch;
  });

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Timestamp',
      'Protocol',
      'Source_IP',
      'Source_Port',
      'Destination_IP',
      'Destination_Port',
      'Packets',
      'Bytes',
      'Status',
    ];
    const rows = filteredFlows.map((f) => [
      f.id,
      f.timestamp,
      f.protocol,
      f.source_ip,
      f.source_port,
      f.destination_ip,
      f.destination_port,
      f.packet_count,
      f.byte_count,
      f.status || 'Normal',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cyberpulse_traffic_${Date.now()}.csv`);
    link.click();
  };

  return (
    <>
      <div className="rounded-2xl border border-cyan-500/25 bg-[#070a10]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col">

        <div className="p-4 sm:p-5 border-b border-cyan-500/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#080d16]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide font-mono">
                PACKET FLOW TELEMETRY ({filteredFlows.length})
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Click any row to inspect deep packet headers and raw payload hex dumps
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                placeholder="Search IP, port, proto, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#030508] border border-cyan-500/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-all font-mono"
              />
            </div>

            <div className="inline-flex rounded-xl bg-[#030508] p-1 border border-cyan-500/20 text-xs font-mono">
              {['ALL', 'TCP', 'UDP', 'ICMP'].map((proto) => (
                <button
                  key={proto}
                  onClick={() => setSelectedProto(proto)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedProto === proto
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#00f0ff]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {proto}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1322] border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 text-xs font-mono font-semibold transition-all cursor-pointer"
              title="Export filtered flows as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#030508]/80 text-cyan-400/80 border-b border-cyan-500/15">
                <th className="py-3 px-4 font-semibold">TIME</th>
                <th className="py-3 px-4 font-semibold">PROTO</th>
                <th className="py-3 px-4 font-semibold">SOURCE IP:PORT</th>
                <th className="py-3 px-1"></th>
                <th className="py-3 px-4 font-semibold">TARGET IP:PORT</th>
                <th className="py-3 px-4 font-semibold">PACKETS</th>
                <th className="py-3 px-4 font-semibold">VOLUME</th>
                <th className="py-3 px-4 font-semibold text-right">STATUS</th>
                <th className="py-3 px-3 text-center">CONTROLS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {filteredFlows.length > 0 ? (
                filteredFlows.map((flow, idx) => {
                  const isSuspicious = flow.status === 'Malicious' || flow.status === 'Suspicious';
                  const isWhitelisted = flow.status === 'Whitelisted';
                  const isBlocked = flow.status === 'Blocked';

                  return (
                    <tr
                      key={flow.id || idx}
                      onClick={() => setSelectedFlow(flow)}
                      className="hover:bg-cyan-500/5 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {flow.timestamp ? new Date(flow.timestamp).toLocaleTimeString() : 'Live'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            flow.protocol === 'TCP'
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : flow.protocol === 'UDP'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {flow.protocol || 'TCP'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-cyan-200 whitespace-nowrap group-hover:text-cyan-400 transition-colors">
                        {flow.source_ip}
                        {flow.source_port ? `:${flow.source_port}` : ''}
                      </td>
                      <td className="py-3 px-1 text-slate-600 text-center">
                        <ArrowRight className="w-3 h-3 inline" />
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300 whitespace-nowrap">
                        {flow.destination_ip}
                        {flow.destination_port ? `:${flow.destination_port}` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {flow.packet_count ? flow.packet_count.toLocaleString() : '1'} pkts
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {formatBytes(flow.byte_count)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            isSuspicious
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(255,0,85,0.25)]'
                              : isWhitelisted
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(0,255,157,0.2)]'
                              : isBlocked
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {flow.status || 'Normal'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedFlow(flow)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Inspect Packet (Hex Dump)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isSuspicious && onBlockIp && (
                            <button
                              onClick={() => onBlockIp(flow.source_ip, `Manually blocked from telemetry: #${flow.id}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Block Source IP"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isWhitelisted && onWhitelistIp && (
                            <button
                              onClick={() => onWhitelistIp(flow.source_ip, `Whitelisted from flow: #${flow.id}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="Add to Whitelist"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No matching traffic flows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#030508]/80 border-t border-cyan-500/15 text-xs font-mono text-slate-400 flex items-center justify-between">
          <span>Active telemetry count: {filteredFlows.length} flows</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2 cursor-pointer"
            >
              Refresh Socket Buffer
            </button>
          )}
        </div>
      </div>

      {selectedFlow && (
        <PacketModal
          flow={selectedFlow}
          onClose={() => setSelectedFlow(null)}
          onBlockIp={onBlockIp}
          onWhitelistIp={onWhitelistIp}
        />
      )}
    </>
  );
}
