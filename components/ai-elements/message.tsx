import { cn } from '../../lib/utils';
import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import type { ComponentProps, HTMLAttributes } from 'react';
import { memo } from 'react';
import { Streamdown } from 'streamdown';
import { createSafeCodeHighlighter } from './streamdownCodeHighlighter';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant' | 'system' | 'tool';
};

// Public CSS hooks for user customization (Settings → Appearance → Custom CSS):
//   .ai-chat-message[data-role="user"]      — outer row, user-authored
//   .ai-chat-message[data-role="assistant"] — outer row, assistant reply
//   .ai-chat-message-content[data-role=...] — inner bubble / content area
// These attributes are part of the UI's stable contract; do not rename
// without updating Custom CSS docs.
//
// Layout mirrors Claude: no per-message role chips, user soft bubbles,
// assistant as open prose without card chrome.
export const Message = ({ className, from, children, ...props }: MessageProps) => {
  const isUser = from === 'user';
  const isAssistant = from === 'assistant';

  return (
    <div
      className={cn(
        'ai-chat-message group flex w-full flex-col',
        isUser && 'is-user items-end',
        isAssistant && 'is-assistant items-stretch',
        !isUser && !isAssistant && 'items-stretch',
        className,
      )}
      data-role={from}
      {...props}
    >
      {children}
    </div>
  );
};

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
  from?: 'user' | 'assistant' | 'system' | 'tool';
};

export const MessageContent = ({ children, className, from, ...props }: MessageContentProps) => (
  <div
    className={cn(
      'ai-chat-message-content flex min-w-0 max-w-full flex-col gap-2 text-[14.5px] leading-[1.7]',
      // User — Claude-style soft bubble (muted surface, not solid brand fill)
      'group-[.is-user]:ml-auto group-[.is-user]:w-fit group-[.is-user]:max-w-[min(88%,34rem)]',
      'group-[.is-user]:overflow-x-clip group-[.is-user]:rounded-[1.25rem]',
      'group-[.is-user]:bg-secondary/90 group-[.is-user]:text-foreground',
      'group-[.is-user]:px-4 group-[.is-user]:py-2.5',
      'group-[.is-user]:shadow-none',
      // Assistant — open prose, no card / border / left rail
      'group-[.is-assistant]:w-full group-[.is-assistant]:max-w-full',
      'group-[.is-assistant]:rounded-none group-[.is-assistant]:border-0',
      'group-[.is-assistant]:bg-transparent group-[.is-assistant]:px-0.5 group-[.is-assistant]:py-0.5',
      'group-[.is-assistant]:shadow-none group-[.is-assistant]:ring-0',
      'group-[.is-assistant]:text-foreground/95',
      className,
    )}
    data-role={from}
    {...props}
  >
    {children}
  </div>
);

const safeCode = createSafeCodeHighlighter(code);
const streamdownPlugins = { cjk, code: safeCode };

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        'size-full min-w-0 text-[14.5px] leading-[1.72] [overflow-wrap:anywhere]',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        // Code
        '[&_code]:text-[13px] [&_code]:font-mono [&_code]:leading-normal',
        '[&_p_code]:px-[0.4em] [&_p_code]:py-[0.15em] [&_p_code]:rounded-md [&_p_code]:bg-foreground/[0.06] [&_p_code]:text-[90%] [&_p_code]:whitespace-normal [&_p_code]:[overflow-wrap:anywhere]',
        // Body rhythm — Claude-like prose spacing
        '[&_p]:my-2.5 [&_p]:leading-[1.72]',
        '[&_ul]:my-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5',
        '[&_ol]:my-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5',
        '[&_li]:my-0.5 [&_li]:leading-[1.65] [&_li]:marker:text-muted-foreground/45',
        '[&_h1]:text-[1.15rem] [&_h1]:font-semibold [&_h1]:mt-5 [&_h1]:mb-2.5 [&_h1]:leading-snug [&_h1]:tracking-tight',
        '[&_h2]:text-[1.02rem] [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:leading-snug [&_h2]:tracking-tight',
        '[&_h3]:text-[0.95rem] [&_h3]:font-semibold [&_h3]:mt-3.5 [&_h3]:mb-1.5 [&_h3]:leading-snug',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-3.5 [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground [&_blockquote]:leading-relaxed',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/35 hover:[&_a]:decoration-primary',
        '[&_hr]:border-border/35 [&_hr]:my-5',
        '[&_pre]:my-3 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/40 [&_pre]:bg-muted/30 [&_pre]:overflow-x-auto',
        '[&_table]:my-3 [&_table]:w-full [&_table]:text-[13px] [&_table]:leading-normal [&_table]:border-collapse',
        '[&_th]:px-2.5 [&_th]:py-1.5 [&_th]:border [&_th]:border-border/35 [&_th]:bg-muted/25 [&_th]:text-left [&_th]:font-medium',
        '[&_td]:px-2.5 [&_td]:py-1.5 [&_td]:border [&_td]:border-border/30',
        className,
      )}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating,
);
MessageResponse.displayName = 'MessageResponse';
