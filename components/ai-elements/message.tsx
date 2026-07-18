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
export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'ai-chat-message group flex w-full max-w-[min(95%,36rem)] flex-col gap-2',
      from === 'user' ? 'is-user ml-auto' : 'is-assistant max-w-full',
      className,
    )}
    data-role={from}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
  from?: 'user' | 'assistant' | 'system' | 'tool';
};

export const MessageContent = ({ children, className, from, ...props }: MessageContentProps) => (
  <div
    className={cn(
      // 1.6 line-height: readable for CJK + Latin without glyph clipping.
      'ai-chat-message-content flex w-fit min-w-0 max-w-full flex-col gap-2 text-[13.5px] leading-[1.6]',
      // User bubble: enough vertical padding; overflow-x only so rounded corners
      // do not clip descenders / multi-line CJK.
      'group-[.is-user]:ml-auto group-[.is-user]:overflow-x-clip group-[.is-user]:rounded-2xl group-[.is-user]:border group-[.is-user]:border-border/55 group-[.is-user]:bg-muted/45 group-[.is-user]:px-3.5 group-[.is-user]:py-2.5 group-[.is-user]:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
      'group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground/92',
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
        'size-full min-w-0 text-[13.5px] leading-[1.65] [overflow-wrap:anywhere]',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        // Code: base styles (code-block overrides are in index.css)
        '[&_code]:text-[12.5px] [&_code]:font-mono [&_code]:leading-normal',
        '[&_p_code]:px-[0.4em] [&_p_code]:py-[0.2em] [&_p_code]:rounded-md [&_p_code]:bg-foreground/[0.06] [&_p_code]:text-[88%] [&_p_code]:whitespace-normal [&_p_code]:[overflow-wrap:anywhere]',
        '[&_p]:my-2 [&_p]:leading-[1.65]',
        '[&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1',
        '[&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1',
        '[&_li]:my-0.5 [&_li]:leading-[1.6]',
        '[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:leading-snug',
        '[&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:mt-3.5 [&_h2]:mb-1.5 [&_h2]:leading-snug',
        '[&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:leading-snug',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border/50 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground [&_blockquote]:leading-relaxed',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
        '[&_hr]:border-border/30 [&_hr]:my-4',
        '[&_pre]:my-2.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto',
        '[&_table]:my-2 [&_table]:text-[12.5px] [&_table]:leading-normal [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:border [&_th]:border-border/30 [&_th]:bg-muted/20 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:border [&_td]:border-border/30',
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
