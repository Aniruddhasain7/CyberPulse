import React, { useState } from 'react';
import {
  Save,
  Cpu,
  Radio,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export default function Settings({
  backendStatus = 'standby',
  captureInterface = 'default',
  onChangeInterface,
  promiscuousMode = true,
  onTogglePromiscuous,
  detectionMode = 'IDS',
  onChangeDetectionMode,
  confidenceThreshold = 0.80,
  onChangeConfidenceThreshold,
  autoBlockThreats = false,
  onToggleAutoBlock,
  flowIdleTimeout = 5,
  onChangeFlowIdleTimeout,
  onSaveSettings,
  onFactoryReset,
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (onSaveSettings) {
      await onSaveSettings({
        captureInterface,
        promiscuousMode,
        detectionMode,
        confidenceThreshold,
        autoBlockThreats,
        flowIdleTimeout: Number(flowIdleTimeout),
      });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6 font-mono text-xs">

      <div className="p-5 rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
        <h2 className="text-xl font-bold text-white tracking-wide font-orbitron">
          NIDS CONFIGURATION
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-sans mt-1">
          Configure packet capture, detection engine parameters, and active response policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        <div className="rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 p-5 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.7)] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-cyan-500/15">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-orbitron">
              DETECTION ENGINE
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Enforcement Mode
              </label>
              <select
                value={detectionMode}
                onChange={(e) => onChangeDetectionMode && onChangeDetectionMode(e.target.value)}
                className="w-full bg-[#030508] border border-cyan-500/30 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-bold"
              >
                <option value="IDS">Passive Detection (IDS)</option>
                <option value="IPS">Active Inline Drop (IPS)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Confidence Threshold ({Math.round(confidenceThreshold * 100)}%)
              </label>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={confidenceThreshold}
                onChange={(e) => onChangeConfidenceThreshold && onChangeConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>50% (Sensitive)</span>
                <span>99% (Strict)</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Auto-Quarantine Threats
              </label>
              <button
                type="button"
                onClick={onToggleAutoBlock}
                className={`w-full py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  autoBlockThreats
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(255,0,85,0.15)]'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {autoBlockThreats ? 'Auto-Block: ACTIVE' : 'Auto-Block: OFF'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 p-5 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.7)] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-cyan-500/15">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-orbitron">
              PACKET CAPTURE
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Capture Interface (NIC)
              </label>
              <select
                value={captureInterface}
                onChange={(e) => onChangeInterface && onChangeInterface(e.target.value)}
                className="w-full bg-[#030508] border border-cyan-500/30 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="default">Default Adapter (Auto)</option>
                <option value="Ethernet">Ethernet NIC</option>
                <option value="Wi-Fi">Wi-Fi (Wireless)</option>
                <option value="Loopback">Loopback (127.0.0.1)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Promiscuous Mode
              </label>
              <button
                type="button"
                onClick={onTogglePromiscuous}
                className={`w-full py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  promiscuousMode
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {promiscuousMode ? 'Promiscuous: ENABLED' : 'Promiscuous: DISABLED'}
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Flow Idle Timeout (seconds)
              </label>
              <input
                type="number"
                value={flowIdleTimeout}
                onChange={(e) => onChangeFlowIdleTimeout && onChangeFlowIdleTimeout(Number(e.target.value))}
                min="1"
                max="120"
                className="w-full bg-[#030508] border border-cyan-500/30 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 p-5 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.7)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-bold text-white block font-orbitron text-sm">ENGINE SOCKET STATUS</span>
            <span className="text-slate-400 text-xs mt-1 block">
              Flask API:{' '}
              <strong className={
                backendStatus === 'connected' ? 'text-emerald-400' :
                backendStatus === 'standby'   ? 'text-amber-400' :
                'text-rose-400'
              }>
                {backendStatus.toUpperCase()}
              </strong>
            </span>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
            backendStatus === 'connected'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${backendStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${backendStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            {backendStatus === 'connected' ? 'API ONLINE' : 'API OFFLINE'}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {onFactoryReset && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Factory Reset</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Configuration saved!
              </span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>SAVE CONFIGURATION</span>
            </button>
          </div>
        </div>
      </form>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#070a10] border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(255,0,85,0.3)]">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base font-orbitron">CONFIRM FACTORY RESET</h3>
            </div>
            <p className="text-slate-300 text-xs font-sans">
              This will reset all NIDS settings, clear the blocked IP list, the trusted whitelist, resolved alerts, and traffic flows.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onFactoryReset) onFactoryReset();
                  setShowResetConfirm(false);
                }}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer shadow-[0_0_15px_rgba(255,0,85,0.4)]"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
