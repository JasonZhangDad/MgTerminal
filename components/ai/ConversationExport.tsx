/**
 * ConversationExport - Dropdown button for exporting chat sessions
 *
 * Small download icon button with a dropdown offering Markdown, JSON,
 * and Plain Text export formats.
 */

import { Download, FileJson, FileText, FileType } from 'lucide-react';
import React, { useCallback } from 'react';
import { useI18n } from '../../application/i18n/I18nProvider';
import type { AISession } from '../../infrastructure/ai/types';
import { Button } from '../ui/button';
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from '../ui/dropdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface ConversationExportProps {
  session: AISession | null;
  onExport: (format: 'md' | 'json' | 'txt') => void;
  className?: string;
}

const EXPORT_OPTIONS = [
  { format: 'md' as const, labelKey: 'ai.chat.exportMarkdown' as const, icon: FileText },
  { format: 'json' as const, labelKey: 'ai.chat.exportJSON' as const, icon: FileJson },
  { format: 'txt' as const, labelKey: 'ai.chat.exportPlainText' as const, icon: FileType },
];

const ConversationExport: React.FC<ConversationExportProps> = ({
  session,
  onExport,
  className,
}) => {
  const { t } = useI18n();
  const handleExport = useCallback(
    (format: 'md' | 'json' | 'txt') => {
      onExport(format);
    },
    [onExport],
  );

  const hasMessages = session && session.messages.length > 0;

  return (
    <Dropdown>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={className ?? 'h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground'}
              disabled={!hasMessages}
            >
              <Download size={14} />
            </Button>
          </DropdownTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('ai.chat.exportConversation')}</TooltipContent>
      </Tooltip>
      <DropdownContent
        align="end"
        sideOffset={6}
        className="w-44 rounded-2xl border border-border/50 bg-popover/96 p-1.5 text-popover-foreground shadow-[0_12px_36px_rgba(0,0,0,0.14)] backdrop-blur-md ring-1 ring-inset ring-white/[0.04]"
      >
        <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/55">
          {t('ai.chat.exportAs')}
        </div>
        {EXPORT_OPTIONS.map(({ format, labelKey, icon: Icon }) => (
          <button
            key={format}
            onClick={() => handleExport(format)}
            className="w-full flex items-center gap-2.5 px-2 py-2 text-[12.5px] rounded-xl transition-colors cursor-pointer hover:bg-primary/10 hover:text-foreground"
          >
            <span className="magiesTerminal-ai-icon-plate h-7 w-7 rounded-lg border-border/50 bg-muted/40 text-muted-foreground">
              <Icon size={13} />
            </span>
            <span className="font-medium">{t(labelKey)}</span>
          </button>
        ))}
      </DropdownContent>
    </Dropdown>
  );
};

export default React.memo(ConversationExport);
