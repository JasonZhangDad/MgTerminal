import {
  matchCodingCliProviderFromCommand,
  matchCodingCliProviderFromTitle,
} from './codingCliProviderMatch';

export type AgentIconKey =
  | 'magiesTerminal'
  | 'copilot'
  | 'cursor'
  | 'openai'
  | 'codex'
  | 'claude'
  | 'anthropic'
  | 'gemini'
  | 'google'
  | 'ollama'
  | 'openrouter'
  | 'zed'
  | 'atom'
  | 'droid'
  | 'opencode'
  | 'kimi'
  | 'codebuddy'
  | 'terminal'
  | 'plus';

export type AgentIconVisual = {
  src: string;
  badgeClassName: string;
  imageClassName: string;
};

export const AGENT_ICON_VISUALS: Record<AgentIconKey, AgentIconVisual> = {
  magiesTerminal: {
    src: '/ai/agents/magiesTerminal.svg',
    badgeClassName: 'border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-violet-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  copilot: {
    src: '/ai/agents/copilot.svg',
    badgeClassName: 'border-zinc-300/80 bg-gradient-to-br from-white to-zinc-100 dark:from-zinc-100 dark:to-zinc-200',
    imageClassName: 'object-contain brightness-0',
  },
  cursor: {
    src: '/ai/agents/cursor.svg',
    badgeClassName: 'border-zinc-500/30 bg-gradient-to-br from-zinc-500/18 to-zinc-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  openai: {
    src: '/ai/providers/openai.svg',
    badgeClassName: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-emerald-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  codex: {
    src: '/ai/agents/codex.svg',
    badgeClassName: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-emerald-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  claude: {
    src: '/ai/agents/claude.svg',
    badgeClassName: 'border-orange-500/30 bg-gradient-to-br from-orange-500/22 to-orange-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  anthropic: {
    src: '/ai/providers/anthropic.svg',
    badgeClassName: 'border-orange-500/30 bg-gradient-to-br from-orange-500/22 to-orange-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  gemini: {
    src: '/ai/agents/gemini.svg',
    badgeClassName: 'border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-sky-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  google: {
    src: '/ai/providers/google.svg',
    badgeClassName: 'border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-sky-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  ollama: {
    src: '/ai/providers/ollama.svg',
    badgeClassName: 'border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-violet-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  openrouter: {
    src: '/ai/providers/openrouter.svg',
    badgeClassName: 'border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  zed: {
    src: '/ai/agents/zed.svg',
    badgeClassName: 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-cyan-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert',
  },
  atom: {
    src: '/ai/agents/atom.svg',
    badgeClassName: 'border-amber-500/28 bg-gradient-to-br from-amber-500/18 to-amber-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  droid: {
    src: '/ai/agents/droid.svg',
    badgeClassName: 'border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-orange-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  opencode: {
    src: '/ai/agents/opencode.svg',
    badgeClassName: 'border-slate-500/30 bg-gradient-to-br from-slate-500/18 to-slate-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  kimi: {
    src: '/ai/providers/kimi.svg',
    badgeClassName: 'border-zinc-500/30 bg-gradient-to-br from-zinc-500/18 to-zinc-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  codebuddy: {
    src: '/ai/agents/codebuddy.svg',
    badgeClassName: 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-indigo-500/8',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  terminal: {
    src: '/ai/agents/terminal.svg',
    badgeClassName: 'border-primary/25 bg-gradient-to-br from-primary/15 to-muted/40',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  plus: {
    src: '/ai/agents/plus.svg',
    badgeClassName: 'border-primary/20 bg-gradient-to-br from-primary/12 to-muted/35',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-90',
  },
};

export type AgentIconSource = {
  icon?: string;
  command?: string;
  name?: string;
  id?: string;
  type?: 'builtin' | 'external';
};

export function normalizeAgentToken(value?: string): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function resolveAgentIconKey(source: AgentIconSource | 'add-more'): AgentIconKey {
  if (source === 'add-more') {
    return 'plus';
  }

  if (source.type === 'builtin') {
    return 'magiesTerminal';
  }

  const commandCandidates = [source.command, source.name, source.id].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  for (const commandLine of commandCandidates) {
    const provider = matchCodingCliProviderFromCommand(commandLine);
    if (provider) return provider.iconKey;
  }

  const titleCandidates = [source.name, source.id, source.icon].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  for (const title of titleCandidates) {
    const provider = matchCodingCliProviderFromTitle(title);
    if (provider) return provider.iconKey;
  }

  const tokens = [
    normalizeAgentToken(source.icon),
    normalizeAgentToken(source.command),
    normalizeAgentToken(source.name),
    normalizeAgentToken(source.id),
  ].filter(Boolean);

  if (tokens.some((token) => token.includes('anthropic'))) {
    return 'anthropic';
  }
  if (
    tokens.some(
      (token) =>
        token.includes('openai') ||
        token.includes('chatgpt'),
    )
  ) {
    return 'openai';
  }
  if (
    tokens.some(
      (token) =>
        token.includes('google') ||
        token.includes('googlegemini'),
    )
  ) {
    return 'google';
  }
  if (tokens.some((token) => token.includes('ollama'))) {
    return 'ollama';
  }
  if (tokens.some((token) => token.includes('openrouter'))) {
    return 'openrouter';
  }
  if (tokens.some((token) => token.includes('zed'))) {
    return 'zed';
  }
  if (tokens.some((token) => token.includes('factory'))) {
    return 'atom';
  }

  return 'terminal';
}

export function getAgentIconVisual(key: AgentIconKey): AgentIconVisual {
  return AGENT_ICON_VISUALS[key];
}
