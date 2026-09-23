import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Pause, ShieldAlert, Cpu, ShieldCheck } from 'lucide-react';

export function TrafficChart({ isLive = true, flows = [], sessionPackets = 0 }) {
  const [metric, setMetric] = useState('packets');
  const [paused, setPaused] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const sessionPacketsRef = useRef(sessionPackets);
  const prevPacketsRef = useRef(sessionPackets);
  const flowsRef = useRef(flows);
  const lastTickTimeRef = useRef(Date.now());

  useEffect(() => {
    sessionPacketsRef.current = sessionPackets;
  }, [sessionPackets]);

  useEffect(() => {
    flowsRef.current = flows;
  }, [flows]);

  const buildInitialPoints = () => {
    const now = Date.now();
    const count = 20;
    const intervalMs = 2000;
    const pts = [];

    const recentFlows = Array.isArray(flows) && flows.length > 0 ? [...flows].slice(0, count).reverse() : [];

    for (let i = count - 1; i >= 0; i--) {
      const t = new Date(now - i * intervalMs);
      const timeStr = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
      
      const flowIndex = count - 1 - i;
      const matchingFlow = recentFlows[flowIndex];

      if (matchingFlow) {
        const pkts = matchingFlow.packet_count || 1;
        const bytes = matchingFlow.byte_count || pkts * 420;
        pts.push({
          time: timeStr,
          packets: pkts,
          bandwidth: Math.round((bytes / 1024) * 10) / 10,
          flows: 1,
        });
      } else {
        pts.push({
          time: timeStr,
          packets: 0,
          bandwidth: 0,
          flows: 0,
        });
      }
    }
    return pts;
  };

  const [dataPoints, setDataPoints] = useState(buildInitialPoints);

  useEffect(() => {
    if (Array.isArray(flows) && flows.length > 0) {
      setDataPoints((prev) => {
        const hasActivity = prev.some((p) => p.packets > 0 || p.bandwidth > 0);
        if (!hasActivity) {
          return buildInitialPoints();
        }
        return prev;
      });
    }
  }, [flows?.length]);

  useEffect(() => {
    if (!isLive || paused) {
      prevPacketsRef.current = sessionPacketsRef.current;
      lastTickTimeRef.current = Date.now();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.max(0.8, (now - lastTickTimeRef.current) / 1000);
      lastTickTimeRef.current = now;

      const d = new Date(now);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

      const currPackets = sessionPacketsRef.current;
      const prevPackets = prevPacketsRef.current;
      const deltaPkts = Math.max(0, currPackets - prevPackets);
      prevPacketsRef.current = currPackets;

      let pktRate = Math.round(deltaPkts / elapsedSec);
      
      const currentFlows = flowsRef.current || [];
      const recentFlowsCount = currentFlows.slice(0, 3).length;
      if (pktRate === 0 && deltaPkts > 0) {
        pktRate = deltaPkts;
      }

      const bandwidthRate = Math.round((pktRate * 0.65) * 10) / 10;
      const flowRate = deltaPkts > 0 ? Math.max(1, Math.min(recentFlowsCount, Math.ceil(pktRate / 4))) : 0;

      setDataPoints((prev) => {
        const next = prev.length >= 22 ? prev.slice(1) : [...prev];
        return [
          ...next,
          {
            time: timeStr,
            packets: pktRate,
            bandwidth: bandwidthRate,
            flows: flowRate,
          },
        ];
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isLive, paused]);

  const width = 760;
  const height = 210;
  const paddingLeft = 50;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const currentValues = dataPoints.map((d) => d[metric] || 0);
  const rawMax = Math.max(...currentValues, 0);

  const getNiceMax = (val) => {
    if (val <= 5) return 10;
    if (val <= 15) return 20;
    if (val <= 40) return 50;
    if (val <= 80) return 100;
    if (val <= 200) return 250;
    if (val <= 450) return 500;
    return Math.ceil(val * 1.25 / 100) * 100;
  };

  const maxValue = getNiceMax(rawMax);
  const avgValue = currentValues.length > 0 ? Math.round((currentValues.reduce((a, b) => a + b, 0) / currentValues.length) * 10) / 10 : 0;
  const peakValue = rawMax;
  const latestValue = currentValues[currentValues.length - 1] || 0;

  const points = dataPoints.map((d, index) => {
    const x = paddingLeft + (index / Math.max(dataPoints.length - 1, 1)) * graphWidth;
    const val = d[metric] || 0;
    const y = height - paddingBottom - (val / maxValue) * graphHeight;
    return { x, y, val, ...d };
  });

  const getCubicBezierPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = getCubicBezierPath(points);
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - paddingBottom} L ${points[0].x.toFixed(1)} ${height - paddingBottom} Z`
    : '';

  const metricConfig = {
    packets: { unit: 'pkts/s', label: 'Packets / sec', strokeColor: '#00f0ff', accentColor: 'text-cyan-400' },
    bandwidth: { unit: 'KB/s', label: 'Throughput', strokeColor: '#a855f7', accentColor: 'text-purple-400' },
    flows: { unit: 'flows/s', label: 'Flows / sec', strokeColor: '#10b981', accentColor: 'text-emerald-400' },
  }[metric];

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-[#070a10]/95 p-5 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] transition-all">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide font-mono">
                TELEMETRY THROUGHPUT GRAPH
              </h3>
              {isLive && !paused ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE STREAM
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                  {paused ? 'PAUSED' : 'STANDBY'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
              <span>
                Current: <strong className="text-white font-extrabold">{latestValue}</strong> {metricConfig.unit}
              </span>
              <span className="text-slate-600">•</span>
              <span>
                Peak: <strong className="text-cyan-300 font-bold">{peakValue}</strong> {metricConfig.unit}
              </span>
              <span className="text-slate-600">•</span>
              <span>
                Avg: <strong className="text-slate-300">{avgValue}</strong> {metricConfig.unit}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-[#030508] p-1 border border-slate-800">
            <button
              onClick={() => setMetric('packets')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                metric === 'packets'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pkts/s
            </button>
            <button
              onClick={() => setMetric('bandwidth')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                metric === 'bandwidth'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Throughput (KB/s)
            </button>
            <button
              onClick={() => setMetric('flows')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                metric === 'flows'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Flows
            </button>
          </div>

          <button
            onClick={() => setPaused(!paused)}
            className="p-1.5 rounded-xl bg-[#030508] border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer"
            title={paused ? 'Resume Live Stream' : 'Pause Live Stream'}
          >
            {paused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden py-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 sm:h-52 overflow-visible font-mono select-none"
        >
          <defs>
            <linearGradient id="cyberAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricConfig.strokeColor} stopOpacity="0.32" />
              <stop offset="60%" stopColor={metricConfig.strokeColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={metricConfig.strokeColor} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="cyberLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor={metricConfig.strokeColor} />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            <filter id="cyberGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - paddingBottom - ratio * graphHeight;
            const labelVal = Math.round(ratio * maxValue);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke={ratio === 0 ? '#334155' : '#1e293b'}
                  strokeDasharray={ratio === 0 ? 'none' : '3 4'}
                  strokeWidth={ratio === 0 ? '1.5' : '1'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#cyberAreaGrad)" />}

          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#cyberLineGrad)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cyberGlow)"
            />
          )}

          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingTop}
              x2={hoveredPoint.x}
              y2={height - paddingBottom}
              stroke="#00f0ff"
              strokeDasharray="2 2"
              strokeWidth="1.2"
              opacity="0.75"
            />
          )}

          {points.map((p, i) => {
            const isHovered = hoveredPoint && hoveredPoint.x === p.x;
            const isLast = i === points.length - 1;
            const showXLabel = i % 4 === 0 || isLast;

            return (
              <g key={i} className="group cursor-pointer">
                <rect
                  x={p.x - (graphWidth / points.length) / 2}
                  y={paddingTop}
                  width={graphWidth / points.length}
                  height={graphHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : isLast ? 4.5 : 2.5}
                  fill="#030508"
                  stroke={isHovered ? '#ffffff' : isLast ? '#a855f7' : metricConfig.strokeColor}
                  strokeWidth={isHovered ? '2.5' : '2'}
                  className="transition-all duration-150"
                  filter={isHovered || isLast ? 'url(#cyberGlow)' : undefined}
                />

                {showXLabel && (
                  <text
                    x={p.x}
                    y={height - 12}
                    textAnchor={isLast ? 'end' : i === 0 ? 'start' : 'middle'}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="500"
                  >
                    {p.time}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute z-30 px-3.5 py-2 rounded-xl bg-[#070b14]/95 border border-cyan-400 text-xs font-mono shadow-[0_0_25px_rgba(0,240,255,0.4)] pointer-events-none transition-all duration-75 whitespace-nowrap backdrop-blur-md"
            style={{
              left: `${Math.min(Math.max((hoveredPoint.x / width) * 100, 12), 88)}%`,
              top: `${Math.max(10, Math.min((hoveredPoint.y / height) * 100, 75))}%`,
              transform: hoveredPoint.y < 70
                ? 'translate(-50%, 14px)'
                : 'translate(-50%, calc(-100% - 14px))',
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-cyan-500/20 pb-1 mb-1.5">
              <span className="text-cyan-300 font-bold text-[10px] tracking-wider">
                TIMESTAMP
              </span>
              <span className="text-slate-300 text-[10px]">{hoveredPoint.time}</span>
            </div>
            <div className="space-y-1">
              <div className="text-white font-extrabold text-xs flex items-center justify-between gap-3">
                <span className="text-slate-400 font-normal">Packets:</span>
                <span className="text-cyan-400">{hoveredPoint.packets} pkts/s</span>
              </div>
              <div className="text-white font-extrabold text-xs flex items-center justify-between gap-3">
                <span className="text-slate-400 font-normal">Throughput:</span>
                <span className="text-purple-400">{hoveredPoint.bandwidth} KB/s</span>
              </div>
              <div className="text-white font-extrabold text-xs flex items-center justify-between gap-3">
                <span className="text-slate-400 font-normal">Active Flows:</span>
                <span className="text-emerald-400">{hoveredPoint.flows || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PALETTE = [
  { color: '#ff0055', glow: '#ff0055', text: 'text-rose-400' },
  { color: '#f59e0b', glow: '#f59e0b', text: 'text-amber-400' },
  { color: '#eab308', glow: '#eab308', text: 'text-yellow-400' },
  { color: '#00f0ff', glow: '#00f0ff', text: 'text-cyan-400' },
  { color: '#a855f7', glow: '#a855f7', text: 'text-purple-400' },
  { color: '#22c55e', glow: '#22c55e', text: 'text-emerald-400' },
  { color: '#f97316', glow: '#f97316', text: 'text-orange-400' },
  { color: '#3b82f6', glow: '#3b82f6', text: 'text-blue-400' },
];

export function AttackChart({ data = [], onFilterAttack }) {
  const hasData = Array.isArray(data) && data.length > 0;
  const total = hasData ? data.reduce((sum, a) => sum + (a.count || 0), 0) : 0;

  const attacks = hasData
    ? data.map((item, i) => ({
        name: item.name,
        count: item.count || 0,
        percentage: total > 0 ? Math.round(((item.count || 0) / total) * 100) : 0,
        ...PALETTE[i % PALETTE.length],
      }))
    : [];

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-[#070a10]/90 p-5 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(255,0,85,0.25)]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide font-mono">
                AI ATTACK MATRIX
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {total > 0 ? 'Live from database' : 'Threat telemetry monitor'}
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold shadow-[0_0_8px_rgba(255,0,85,0.3)]">
            {total} EVENTS
          </span>
        </div>

        {total === 0 ? (
          <div className="py-10 text-center text-slate-500 font-mono space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-400/60" />
            <p className="text-xs font-bold text-emerald-400">0 Threat Events Detected</p>
            <p className="text-[10px] text-slate-500 font-sans">Network telemetry is clean. No active attacks identified.</p>
          </div>
        ) : (
          <>
            <div className="w-full h-3.5 rounded-full bg-[#030508] p-0.5 border border-slate-800 overflow-hidden flex mb-5">
              {attacks.map((item, idx) => (
                <div
                  key={idx}
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  className="h-full transition-all duration-500 hover:brightness-125"
                  title={`${item.name}: ${item.percentage}%`}
                />
              ))}
            </div>

            <div className="space-y-2.5">
              {attacks.map((attack, i) => (
                <div
                  key={i}
                  onClick={() => onFilterAttack && onFilterAttack(attack.name)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#030508]/80 hover:bg-[#0c121e] border border-slate-800/80 hover:border-cyan-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: attack.color, boxShadow: `0 0 8px ${attack.glow}` }}
                    />
                    <span className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 font-mono truncate max-w-35">
                      {attack.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                      {attack.count}
                    </span>
                    <span className="text-[11px] text-slate-500 min-w-8.5 text-right">
                      {attack.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
          <Cpu className="w-3 h-3" />
          ONNX Engine: Active
        </span>
        <span>Updated real-time</span>
      </div>
    </div>
  );
}

export default { TrafficChart, AttackChart };

