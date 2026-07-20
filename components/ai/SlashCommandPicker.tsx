import { MessageSquare, Package } from 'lucide-react';
import React from 'react';
import type { AIQuickMessage, SlashCommandItem, UserSkillSlashOption } from '../../infrastructure/ai/quickMessages';
import { getSlashCommandItemId } from '../../infrastructure/ai/quickMessages';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

export interface SlashCommandPickerProps {
  listboxId: string;
  ariaLabel: string;
  quickMessages: AIQuickMessage[];
  userSkills: UserSkillSlashOption[];
  slashCommandItems: SlashCommandItem[];
  activeMenuIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelectQuickMessage: (message: AIQuickMessage) => void;
  onSelectSkill: (skill: UserSkillSlashOption) => void;
  quickMessagesSectionLabel: string;
  userSkillsSectionLabel: string;
  noResultsLabel: string;
  emptyHintLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  listRef?: React.Ref<HTMLDivElement>;
}

export const SlashCommandPicker: React.FC<SlashCommandPickerProps> = ({
  listboxId,
  ariaLabel,
  quickMessages,
  userSkills,
  slashCommandItems,
  activeMenuIndex,
  onActiveIndexChange,
  onSelectQuickMessage,
  onSelectSkill,
  quickMessagesSectionLabel,
  userSkillsSectionLabel,
  noResultsLabel,
  emptyHintLabel,
  className,
  style,
  listRef,
}) => {
  const activeItem = slashCommandItems[activeMenuIndex];
  const activeDescendantId = activeItem ? `${listboxId}-${getSlashCommandItemId(activeItem)}` : undefined;

  return (
    <div
      ref={listRef}
      id={listboxId}
      role="listbox"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-activedescendant={activeDescendantId}
      className={className}
      style={style}
    >
      <ScrollArea className="max-h-[280px]">
        <div className="p-1.5">
          {slashCommandItems.length === 0 ? (
            <div className="px-3 py-5 text-center space-y-1.5">
              <div className="magiesTerminal-ai-icon-plate mx-auto mb-2 h-9 w-9 rounded-xl border-border/50 bg-muted/40 text-muted-foreground/60">
                <MessageSquare size={16} />
              </div>
              <p className="text-[12px] font-medium text-muted-foreground/75">{noResultsLabel}</p>
              {emptyHintLabel ? (
                <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{emptyHintLabel}</p>
              ) : null}
            </div>
          ) : (
            <>
              {quickMessages.length > 0 ? (
                <>
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {quickMessagesSectionLabel}
                  </div>
                  {quickMessages.map((message) => {
                    const idx = slashCommandItems.findIndex(
                      (item) => item.kind === 'quickMessage' && item.message.id === message.id,
                    );
                    const isActive = idx === activeMenuIndex;
                    return (
                      <button
                        id={`${listboxId}-${message.id}`}
                        key={message.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => onActiveIndexChange(idx)}
                        onClick={() => onSelectQuickMessage(message)}
                        className={cn(
                          'w-full rounded-xl px-2 py-2 text-left transition-colors cursor-pointer',
                          isActive ? 'bg-primary/12 ring-1 ring-primary/20' : 'hover:bg-muted/35',
                        )}
                      >
                        <div className="flex items-center gap-2.5 text-[12.5px] min-w-0">
                          <span className={cn(
                            'magiesTerminal-ai-icon-plate h-7 w-7 rounded-lg border',
                            isActive
                              ? 'border-primary/30 bg-primary/15 text-primary'
                              : 'border-border/50 bg-muted/40 text-muted-foreground/70',
                          )}>
                            <MessageSquare size={13} />
                          </span>
                          <span className="text-foreground/90 font-medium truncate">{message.name}</span>
                          <span className="text-muted-foreground/50 font-mono shrink-0 text-[11px]">/{message.slug}</span>
                        </div>
                        {(message.description || message.content) ? (
                          <div className="pl-9.5 pt-0.5 text-[10.5px] leading-4.5 text-muted-foreground/62 line-clamp-2">
                            {message.description || message.content}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </>
              ) : null}

              {userSkills.length > 0 ? (
                <>
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {userSkillsSectionLabel}
                  </div>
                  {userSkills.map((skill) => {
                    const idx = slashCommandItems.findIndex(
                      (item) => item.kind === 'userSkill' && item.skill.slug === skill.slug,
                    );
                    const isActive = idx === activeMenuIndex;
                    return (
                      <button
                        id={`${listboxId}-skill-${skill.slug}`}
                        key={skill.slug}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => onActiveIndexChange(idx)}
                        onClick={() => onSelectSkill(skill)}
                        className={cn(
                          'w-full rounded-xl px-2 py-2 text-left transition-colors cursor-pointer',
                          isActive ? 'bg-primary/12 ring-1 ring-primary/20' : 'hover:bg-muted/35',
                        )}
                      >
                        <div className="flex items-center gap-2.5 text-[12.5px] min-w-0">
                          <span className={cn(
                            'magiesTerminal-ai-icon-plate h-7 w-7 rounded-lg border',
                            isActive
                              ? 'border-primary/30 bg-primary/15 text-primary'
                              : 'border-border/50 bg-muted/40 text-muted-foreground/70',
                          )}>
                            <Package size={13} />
                          </span>
                          <span className="text-foreground/90 font-medium truncate">{skill.name}</span>
                          <span className="text-muted-foreground/50 font-mono shrink-0 text-[11px]">/{skill.slug}</span>
                        </div>
                        {skill.description ? (
                          <div className="pl-9.5 pt-0.5 text-[10.5px] leading-4.5 text-muted-foreground/62 line-clamp-2">
                            {skill.description}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </>
              ) : null}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
