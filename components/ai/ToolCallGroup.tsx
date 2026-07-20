/**
 * ToolCallGroup - Collapsible container for grouped tool calls.
 *
 * Groups consecutive tool-call messages into a single collapsible section
 * (Codex-style). While the agent is still working the group stays expanded;
 * once the assistant responds it auto-collapses to "Used N tools".
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../application/i18n/I18nProvider';
import { cn } from '../../lib/utils';

interface ToolCallGroupProps {
  count: number;
  children: React.ReactNode;
  /** When true the group starts expanded (e.g. while streaming). */
  defaultExpanded?: boolean;
}

const ToolCallGroup: React.FC<ToolCallGroupProps> = ({
  count,
  children,
  defaultExpanded = false,
}) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const prevDefault = useRef(defaultExpanded);

  // Auto-collapse when the group transitions from "active" to "resolved"
  useEffect(() => {
    if (prevDefault.current && !defaultExpanded) {
      setExpanded(false);
    }
    prevDefault.current = defaultExpanded;
  }, [defaultExpanded]);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          'w-full flex items-center gap-2 px-1 py-1.5 text-xs cursor-pointer rounded-lg',
          'hover:bg-muted/40 transition-colors select-none',
        )}
      >
        {expanded
          ? <ChevronDown size={12} className="text-muted-foreground/55 shrink-0" />
          : <ChevronRight size={12} className="text-muted-foreground/45 shrink-0" />
        }
        <span className="text-muted-foreground/75 font-medium tracking-wide">
          {t('ai.chat.usedTools', { n: count })}
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/45">
          {count}
        </span>
      </button>
      {expanded && (
        <div className="space-y-1.5 pl-1 pt-1 pb-0.5">
          {children}
        </div>
      )}
    </div>
  );
};

export default ToolCallGroup;
