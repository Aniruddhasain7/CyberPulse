import React, { useState } from 'react';
import {
  RefreshCw,
  Play,
  Square,
  Filter,
  Trash2,
  Download,
  Terminal,
  Network,
} from 'lucide-react';
import TrafficTable from '../components/TrafficTable';
import { TrafficChart } from '../components/Charts';

export default function Traffic({
  trafficFlows = [],
  onRefresh,
  isRefreshing,
  isMonitoring,
  sessionPackets = 0,
  isTogglingMonitoring = false,
  toggleAction = '',
  onToggleMonitoring,
  onBlockIp,
  onWhitelistIp,
  onClearTraffic,
  captureInterface = 'default',
  onChangeInterface,
  promiscuousMode = true,
  onTogglePromiscuous,
}) {
  const [bpfFilter, setBpfFilter] = useState('');
  const [appliedBpf, setAppliedBpf] = useState('');
  const [packetLimit, setPacketLimit] = useState(100);

  const displayedFlows = trafficFlows.filter((flow) => {
    if (!appliedBpf) return true;
    const bpf = appliedBpf.toLowerCase();

    if (bpf.includes('tcp') && flow.protocol !== 'TCP') return false;
    if (bpf.includes('udp') && flow.protocol !== 'UDP') return false;
    if (bpf.includes('icmp') && flow.protocol !== 'ICMP') return false;

    const portMatches = bpf.match(/port\s+(\d+)/);
    if (portMatches && portMatches[1]) {
      const port = Number(portMatches[1]);
      if (flow.source_port !== port && flow.destination_port !== port) return false;
    }

    const hostMatches = bpf.match(/host\s+([0-9.]+)/);
    if (hostMatches && hostMatches[1]) {
      const host = hostMatches[1];
      if (!flow.source_ip.includes(host) && !flow.destination_ip.includes(host)) return false;
    }

    return true;
  }).slice(0, packetLimit);

  const tcpCount = displayedFlows.filter((f) => f.protocol === 'TCP').length;
  const udpCount = displayedFlows.filter((f) => f.protocol === 'UDP').length;
  const otherCount = displayedFlows.length - tcpCount - udpCount;

  const handleApplyBpf = (e) => {
    e.preventDefault();
    setAppliedBpf(bpfFilter.trim());
  };

  const handleClearBpf = () => {
    setBpfFilter('');
    setAppliedBpf('');
  };

  const handleQuickBpf = (filterString) => {
    setBpfFilter(filterString);
    setAppliedBpf(filterString);
  };

  const handleExportJson = () => {
    const jsonContent = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(displayedFlows, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonContent);
    link.setAttribute('download', `cyberpulse_packet_trace_${Date.now()}.json`);
    link.click();
  };

  return (
    <div className="space-y-6 font-mono text-xs">

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white tracking-wide">
              SOCKET TELEMETRY & PACKET INSPECTION
            </h2>
            {isMonitoring && <span className="w-2 h-2 rounded-full bg-cyan-400 cyber-pulse-dot"></span>}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            Socket-layer packet sniffer • Select interfaces, apply Berkeley Packet Filters (BPF), toggle promiscuous capture, or click any packet for deep payload hex inspection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1322] border border-cyan-500/30">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[11px]">NIC:</span>
            <select
              value={captureInterface}
              onChange={(e) => onChangeInterface && onChangeInterface(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="default" className="bg-[#070b14] text-white">Default Adapter</option>
              <option value="Ethernet" className="bg-[#070b14] text-white">Ethernet</option>
              <option value="Wi-Fi" className="bg-[#070b14] text-white">Wi-Fi</option>
              <option value="Loopback" className="bg-[#070b14] text-white">Loopback (127.0.0.1)</option>
            </select>
          </div>

          {onTogglePromiscuous && (
            <button
              onClick={onTogglePromiscuous}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                promiscuousMode
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Promiscuous mode sniffs all packets on wire, not just traffic directed to this host"
            >
              Promiscuous: {promiscuousMode ? 'ON' : 'OFF'}
            </button>
          )}

          <button
            onClick={onToggleMonitoring}
            disabled={isTogglingMonitoring}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold font-mono text-xs transition-all shadow-md select-none ${
              isTogglingMonitoring
                ? 'opacity-80 cursor-wait bg-slate-800 text-slate-300 border border-slate-700 shadow-none'
                : isMonitoring
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-400 shadow-[0_0_15px_rgba(255,0,85,0.3)] active:scale-95 cursor-pointer'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 cursor-pointer'
            }`}
          >
            {isTogglingMonitoring ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                <span>{toggleAction === 'stopping' ? 'STOPPING...' : 'STARTING...'}</span>
              </>
            ) : isMonitoring ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                STOP CAPTURE
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                START CAPTURE
              </>
            )}
          </button>

          {onClearTraffic && (
            <button
              onClick={onClearTraffic}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b1322] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-all cursor-pointer font-bold"
              title="Stop capture, wipe all traffic flows and alerts, and reset packet counters"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Logs</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0b1322] hover:bg-[#111c33] text-cyan-300 border border-cyan-500/30 font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.7)] space-y-3">
        <form onSubmit={handleApplyBpf} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 font-bold">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>BPF Filter:</span>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={bpfFilter}
              onChange={(e) => setBpfFilter(e.target.value)}
              placeholder="e.g. tcp and port 80, udp or icmp, host 192.168.1.1..."
              className="w-full bg-[#030508] border border-cyan-500/30 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-bold transition-all cursor-pointer"
            >
              Apply Filter
            </button>

            {appliedBpf && (
              <button
                type="button"
                onClick={handleClearBpf}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                Clear
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#030508] border border-cyan-500/20 text-slate-400">
              <span>Limit:</span>
              <select
                value={packetLimit}
                onChange={(e) => setPacketLimit(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={50} className="bg-[#070b14]">50</option>
                <option value={100} className="bg-[#070b14]">100</option>
                <option value={250} className="bg-[#070b14]">250</option>
                <option value={500} className="bg-[#070b14]">500</option>
                <option value={1000} className="bg-[#070b14]">1000</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0b1322] border border-cyan-500/30 text-cyan-300 hover:text-white transition-all cursor-pointer"
              title="Export packet trace as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-cyan-500/10">
          <span className="text-[10px] text-slate-500 uppercase mr-1">Filter Presets:</span>
          {[
            { label: 'HTTP (80)', expr: 'tcp and port 80' },
            { label: 'HTTPS (443)', expr: 'tcp and port 443' },
            { label: 'DNS (53)', expr: 'udp and port 53' },
            { label: 'SSH (22)', expr: 'tcp and port 22' },
            { label: 'ICMP (Ping)', expr: 'icmp' },
            { label: 'All TCP', expr: 'tcp' },
            { label: 'All UDP', expr: 'udp' },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleQuickBpf(preset.expr)}
              className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                appliedBpf === preset.expr
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_6px_#00f0ff]'
                  : 'bg-[#04060c] text-slate-400 hover:text-cyan-300 border border-cyan-500/15'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <TrafficChart isLive={isMonitoring} flows={displayedFlows} sessionPackets={sessionPackets} />

      <TrafficTable
        flows={displayedFlows}
        onRefresh={onRefresh}
        isLoading={isRefreshing}
        onBlockIp={onBlockIp}
        onWhitelistIp={onWhitelistIp}
      />
    </div>
  );
}
