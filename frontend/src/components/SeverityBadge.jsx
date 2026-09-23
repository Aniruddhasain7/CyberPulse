import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function SeverityBadge({ severity = 'Medium', className = '' }) {
  const normalized = String(severity).toLowerCase();

  let styles = {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    icon: Info,
  };

  if (normalized === 'critical') {
    styles = {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: ShieldAlert,
    };
  } else if (normalized === 'high') {
    styles = {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: AlertTriangle,
    };
  } else if (normalized === 'medium') {
    styles = {
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      icon: AlertCircle,
    };
  } else if (normalized === 'low') {
    styles = {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: Info,
    };
  } else if (normalized === 'resolved' || normalized === 'normal') {
    styles = {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
    };
  }

  const IconComponent = styles.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      <IconComponent className="w-3.5 h-3.5 stroke-[2.5]" />
      <span>{severity}</span>
    </span>
  );
}
