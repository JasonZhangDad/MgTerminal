import { AlertCircle, SquareTerminal } from 'lucide-react';
import React from 'react';
import { cn } from '../../../lib/utils';
import type { TerminalToolArtifact } from './terminalToolArtifact';

interface TerminalArtifactCardProps {
  artifact: TerminalToolArtifact;
  className?: string;
}

function formatLineRange(artifact: Extract<TerminalToolArtifact, { kind: 'terminal.context' }>): string {
  if (artifact.returnedLines === 0) {
    return `0 / ${artifact.totalLines} lines`;
  }
  return `lines ${artifact.startLine + 1}-${artifact.endLine + 1} / ${artifact.totalLines}`;
}

function formatSubtitle(artifact: Extract<TerminalToolArtifact, { kind: 'terminal.context' }>): string {
  const parts = [
    formatLineRange(artifact),
    artifact.source,
    artifact.hasMoreBefore || artifact.hasMoreAfter ? 'more available' : null,
  ].filter(Boolean);
  return parts.join(' | ');
}

export const TerminalArtifactCard = React.forwardRef<HTMLDivElement, TerminalArtifactCardProps>(({
  artifact,
  className,
}, ref) => {
  if (artifact.kind === 'error') {
    return (
      <div
        className={cn(
          'magiesTerminal-ai-card flex w-full items-center gap-3 border-destructive/30 bg-gradient-to-br from-destructive/[0.08] to-transparent px-3 py-2.5',
          className,
        )}
        ref={ref}
      >
        <div className="magiesTerminal-ai-icon-plate h-8 w-8 rounded-xl border-destructive/30 bg-destructive/12 text-destructive">
          <AlertCircle size={16} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-[12.5px] font-semibold text-foreground/90">
            Terminal read failed
          </div>
          <div className="truncate text-[11px] text-muted-foreground/65">
            {artifact.message}
          </div>
        </div>
      </div>
    );
  }

  const title = artifact.label || artifact.sessionId;

  return (
    <div
      className={cn(
        'magiesTerminal-ai-card flex w-full items-center gap-3 px-3 py-2.5',
        className,
      )}
      ref={ref}
    >
      <div className="magiesTerminal-ai-icon-plate h-8 w-8 rounded-xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/18 to-emerald-500/8 text-emerald-400">
        <SquareTerminal size={16} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-[12.5px] font-semibold text-foreground/90">
          {title}
        </div>
        <div className="truncate text-[11px] font-mono text-muted-foreground/60">
          {formatSubtitle(artifact)}
        </div>
      </div>
    </div>
  );
});
TerminalArtifactCard.displayName = 'TerminalArtifactCard';
