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
  | 'grok'
  | 'xai'
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
  // ChatGPT brand (OpenAI mark); command remains `codex` under the hood.
  codex: {
    src: '/ai/providers/openai.svg',
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
  grok: {
    src: '/ai/providers/grok.svg',
    badgeClassName: 'border-zinc-500/35 bg-gradient-to-br from-zinc-800/80 to-zinc-600/30',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
  },
  xai: {
    src: '/ai/providers/grok.svg',
    badgeClassName: 'border-zinc-500/35 bg-gradient-to-br from-zinc-800/80 to-zinc-600/30',
    imageClassName: 'object-contain dark:brightness-0 dark:invert opacity-95',
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

/** Map stored/discovery icon slugs to a brand visual key. */
const ICON_SLUG_ALIASES: Record<string, AgentIconKey> = {
  chatgpt: 'openai',
  openai: 'openai',
  codex: 'openai',
  claude: 'claude',
  anthropic: 'anthropic',
  copilot: 'copilot',
  githubcopilot: 'copilot',
  cursor: 'cursor',
  codebuddy: 'codebuddy',
  opencode: 'opencode',
  gemini: 'gemini',
  google: 'google',
  antigravity: 'gemini',
  agy: 'gemini',
  grok: 'grok',
  xai: 'grok',
  kimi: 'kimi',
  moonshot: 'kimi',
  droid: 'droid',
  factory: 'atom',
  atom: 'atom',
  zed: 'zed',
  ollama: 'ollama',
  openrouter: 'openrouter',
  magiesterminal: 'magiesTerminal',
  terminal: 'terminal',
  plus: 'plus',
};

export function resolveIconSlug(icon?: string): AgentIconKey | undefined {
  if (!icon?.trim()) return undefined;
  const raw = icon.trim().toLowerCase();
  const normalized = normalizeAgentToken(icon);
  // Aliases first so historical "codex" stamps render as ChatGPT/OpenAI brand.
  if (normalized && ICON_SLUG_ALIASES[normalized]) return ICON_SLUG_ALIASES[normalized];
  if (ICON_SLUG_ALIASES[raw]) return ICON_SLUG_ALIASES[raw];
  if (raw in AGENT_ICON_VISUALS) return raw as AgentIconKey;
  return undefined;
}

export function resolveAgentIconKey(source: AgentIconSource | 'add-more'): AgentIconKey {
  if (source === 'add-more') {
    return 'plus';
  }

  if (source.type === 'builtin') {
    return 'magiesTerminal';
  }

  // Prefer the explicit brand icon stamped on the agent config / discovery row.
  const fromIcon = resolveIconSlug(source.icon);
  if (fromIcon) return fromIcon;

  const commandCandidates = [source.command, source.name, source.id].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  for (const commandLine of commandCandidates) {
    const provider = matchCodingCliProviderFromCommand(commandLine);
    if (provider) return provider.iconKey;
  }

  const titleCandidates = [source.name, source.id].filter(
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

  if (tokens.some((token) => token.includes('anthropic') || token.includes('claude'))) {
    return tokenIncludes(tokens, 'anthropic') && !tokenIncludes(tokens, 'claude') ? 'anthropic' : 'claude';
  }
  if (
    tokens.some(
      (token) =>
        token.includes('openai') ||
        token.includes('chatgpt') ||
        token.includes('codex'),
    )
  ) {
    return 'openai';
  }
  if (
    tokens.some(
      (token) =>
        token.includes('gemini') ||
        token.includes('antigravity') ||
        token.includes('agy') ||
        token.includes('googlegemini'),
    )
  ) {
    return 'gemini';
  }
  if (tokens.some((token) => token.includes('google'))) {
    return 'google';
  }
  if (tokens.some((token) => token.includes('grok') || token === 'xai')) {
    return 'grok';
  }
  if (tokens.some((token) => token.includes('copilot'))) {
    return 'copilot';
  }
  if (tokens.some((token) => token.includes('cursor'))) {
    return 'cursor';
  }
  if (tokens.some((token) => token.includes('codebuddy'))) {
    return 'codebuddy';
  }
  if (tokens.some((token) => token.includes('opencode'))) {
    return 'opencode';
  }
  if (tokens.some((token) => token.includes('kimi') || token.includes('moonshot'))) {
    return 'kimi';
  }
  if (tokens.some((token) => token.includes('droid'))) {
    return 'droid';
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

function tokenIncludes(tokens: string[], needle: string): boolean {
  return tokens.some((token) => token.includes(needle));
}

export function getAgentIconVisual(key: AgentIconKey): AgentIconVisual {
  return AGENT_ICON_VISUALS[key];
}
