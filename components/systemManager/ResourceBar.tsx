import React, { memo } from 'react';
import { cn } from '../../lib/utils';

type ResourceBarTone = 'sky' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'violet' | 'primary';

const TONE_FILL: Record<ResourceBarTone, string> = {
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  cyan: 'bg-cyan-400',
  rose: 'bg-rose-400',
  violet: 'bg-violet-400',
  primary: 'bg-primary/70',
};

const TONE_GLOW: Record<ResourceBarTone, string> = {
  sky: 'shadow-[0_0_8px_rgba(56,189,248,0.45)]',
  emerald: 'shadow-[0_0_8px_rgba(52,211,153,0.45)]',
  amber: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]',
  cyan: 'shadow-[0_0_8px_rgba(34,211,238,0.45)]',
  rose: 'shadow-[0_0_8px_rgba(251,113,133,0.45)]',
  violet: 'shadow-[0_0_8px_rgba(167,139,250,0.4)]',
  primary: '',
};

interface ResourceBarProps {
  label: string;
  value: number;
  className?: string;
  tone?: ResourceBarTone;
  animated?: boolean;
  showPercent?: boolean;
}

function resolveFill(value: number, tone: ResourceBarTone): string {
  if (value >= 90) return TONE_FILL.rose;
  if (value >= 75) return TONE_FILL.amber;
  return TONE_FILL[tone];
}

function resolveGlow(value: number, tone: ResourceBarTone): string {
  if (value >= 90) return TONE_GLOW.rose;
  if (value >= 75) return TONE_GLOW.amber;
  return TONE_GLOW[tone];
}

export const ResourceBar = memo(function ResourceBar({
  label,
  value,
  className,
  tone = 'primary',
  animated = false,
  showPercent = true,
}: ResourceBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fill = resolveFill(clamped, tone);
  const glow = resolveGlow(clamped, tone);

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {label ? (
        <span className="w-7 shrink-0 font-mono text-[10px] text-muted-foreground">{label}</span>
      ) : null}
      <div className="relative min-w-[48px] h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            fill,
            glow,
            animated && 'transition-[width] duration-700 ease-out motion-reduce:transition-none',
          )}
          style={{ width: `${clamped}%` }}
        />
        {animated && clamped > 0 && (
          <div
            className="system-monitor-bar-sheen pointer-events-none absolute inset-y-0 w-8 opacity-40"
            style={{ left: `calc(${clamped}% - 1.5rem)` }}
          />
        )}
      </div>
      {showPercent ? (
        <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
          {Number.isFinite(value) ? `${value.toFixed(1)}%` : '--'}
        </span>
      ) : null}
    </div>
  );
});
