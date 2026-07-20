import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import React, { useCallback } from 'react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { ArrowDown } from 'lucide-react';

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn('relative flex-1 overflow-x-hidden overflow-y-hidden', className)}
    initial="instant"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn(
      // Claude-like reading column: generous vertical rhythm, soft side padding
      'mx-auto flex w-full min-w-0 max-w-[44rem] flex-col gap-8 overflow-x-hidden px-4 py-6 sm:px-5',
      className,
    )}
    {...props}
  />
);

export const ConversationScrollButton = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleClick = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (isAtBottom) return null;

  return (
    <button
      type="button"
      className={cn(
        'absolute bottom-4 left-1/2 z-10 -translate-x-1/2',
        'flex h-8 w-8 items-center justify-center rounded-full',
        'border border-border/45 bg-background/95 text-muted-foreground backdrop-blur-md',
        'shadow-md transition-colors hover:bg-muted hover:text-foreground cursor-pointer',
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      <ArrowDown size={14} />
    </button>
  );
};
