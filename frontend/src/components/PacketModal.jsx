import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  Ban,
  Terminal,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

export default function PacketModal({ flow, onClose, onBlockIp, onWhitelistIp }) {
  const [copied, setCopied] = useState(false);

  if (!flow) return null;

  const isSuspicious = flow.status === 'Suspicious' || flow.status === 'Malicious';
  const isWhitelisted = flow.status === 'Whitelisted';
  const isBlocked = flow.status === 'Blocked';

  const hexDump = [
    { offset: '0000', hex: '45 00 00 3c 1c 46 40 00 40 06 b1 e6 c0 a8 01 69', ascii: 'E..<.F@.@...i' },
    { offset: '0010', hex: '8e fa be 2e d4 2b 01 bb 9a b1 2c 40 00 00 00 00', ascii: '.....+....,@....' },
    { offset: '0020', hex: 'a0 02 72 10 3a 4a 00 00 02 04 05 b4 04 02 08 0a', ascii: '..r.:J..........' },
    { offset: '0030', hex: '6a 89 d3 12 00 00 00 00 01 03 03 07 55 4e 49 4f', ascii: 'j...........UNIO' },
    { offset: '0040', hex: '4e 20 53 45 4c 45 43 54 20 2a 20 46 52 4f 4d 20', ascii: 'N SELECT * FROM ' },
  ];

  const handleCopyHex = () => {
    const raw = hexDump.map((h) => `${h.offset}  ${h.hex}  |${h.ascii}|`).join('\n');
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#070a10] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isSuspicious
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : isWhitelisted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}
            >
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide font-mono">
                  DEEP PACKET INSPECTION: #{flow.id || 'LIVE'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    isSuspicious
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : isWhitelisted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isBlocked
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {flow.status || 'Normal'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Captured: {flow.timestamp ? new Date(flow.timestamp).toLocaleString() : 'Active session'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs font-mono">

          <div className="p-4 rounded-xl bg-[#030508] border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Source IP & Port</span>
              <div className="text-sm font-bold text-cyan-300">
                {flow.source_ip}:{flow.source_port || 'ANY'}
              </div>
            </div>

            <div className="flex items-center gap-2 text-cyan-400 font-bold px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30">
              <span>{flow.protocol || 'TCP'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="text-center sm:text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Destination IP & Port</span>
              <div className="text-sm font-bold text-slate-200">
                {flow.destination_ip}:{flow.destination_port || 'ANY'}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              OSI PROTOCOL STACK HEADERS
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#05070c] border border-slate-800">
                <span className="text-slate-500 text-[10px] block">LAYER 2 (DATA LINK)</span>
                <span className="text-slate-300 font-semibold text-[11px] block truncate">
                  MAC: 52:54:00:12:34:56
                </span>
                <span className="text-slate-500 text-[10px]">Ethernet II</span>
              </div>

              <div className="p-3 rounded-lg bg-[#05070c] border border-slate-800">
                <span className="text-slate-500 text-[10px] block">LAYER 3 (NETWORK)</span>
                <span className="text-cyan-300 font-semibold text-[11px] block">
                  IPv4 TTL: 64
                </span>
                <span className="text-slate-500 text-[10px]">Checksum: 0xb1e6</span>
              </div>

              <div className="p-3 rounded-lg bg-[#05070c] border border-slate-800">
                <span className="text-slate-500 text-[10px] block">LAYER 4 (TRANSPORT)</span>
                <span className="text-amber-400 font-semibold text-[11px] block">
                  Flags: SYN, PSH, ACK
                </span>
                <span className="text-slate-500 text-[10px]">Win: 29200</span>
              </div>

              <div className="p-3 rounded-lg bg-[#05070c] border border-slate-800">
                <span className="text-slate-500 text-[10px] block">FLOW TELEMETRY</span>
                <span className="text-emerald-400 font-semibold text-[11px] block">
                  {flow.packet_count ? flow.packet_count.toLocaleString() : 1} pkts
                </span>
                <span className="text-slate-500 text-[10px]">
                  {flow.byte_count ? `${(flow.byte_count / 1024).toFixed(1)} KB` : '1.2 KB'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Raw Payload Hex Dump & ASCII Decoder
              </span>
              <button
                onClick={handleCopyHex}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#0b1322] border border-cyan-500/20 text-cyan-400 hover:text-white text-[10px] cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Hex'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#030508] border border-slate-800 font-mono text-[11px] overflow-x-auto select-all leading-relaxed">
              {hexDump.map((line) => (
                <div key={line.offset} className="flex gap-4">
                  <span className="text-slate-600 select-none">{line.offset}</span>
                  <span className="text-cyan-300/90">{line.hex}</span>
                  <span className="text-slate-400 border-l border-slate-800 pl-3 select-text">
                    |{line.ascii}|
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#050810] border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBlockIp && (
              <button
                onClick={() => {
                  onBlockIp(flow.source_ip, `Administrative isolation from packet #${flow.id}`);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400 font-bold transition-all cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block Source IP</span>
              </button>
            )}

            {onWhitelistIp && (
              <button
                onClick={() => {
                  onWhitelistIp(flow.source_ip, `Whitelisted from packet #${flow.id}`);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400 font-bold transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Add to Whitelist</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
