import {
  AlertCircle,
  BookOpen,
  FileCode,
  FilePenLine,
  FileText,
  FolderInput,
  LayoutGrid,
  Library,
  ListChecks,
  NotebookPen,
  Pause,
  Play,
  Server,
  ServerCog,
  SquareTerminal,
  Trash2,
  Zap,
} from 'lucide-react';
import React from 'react';
import { cn } from '../../../lib/utils';
import type { VaultToolArtifact } from './vaultToolArtifact';

export type VaultArtifactVisualKind =
  | 'noteCreate'
  | 'noteUpdate'
  | 'noteRead'
  | 'noteList'
  | 'host'
  | 'hostCreate'
  | 'hostImport'
  | 'hostList'
  | 'snippet'
  | 'snippetCreate'
  | 'snippetUpdate'
  | 'snippetList'
  | 'snippetRun'
  | 'snippetDeleted'
  | 'script'
  | 'scriptCreate'
  | 'scriptUpdate'
  | 'scriptList'
  | 'scriptRun'
  | 'scriptDeleted'
  | 'scriptRuns'
  | 'scriptAction'
  | 'scriptReference'
  | 'error';

const ARTIFACT_ICON_SIZE = 16;

const VISUAL_STYLES: Record<VaultArtifactVisualKind, { wrapper: string; icon: string }> = {
  noteCreate: { wrapper: 'border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-violet-500/8', icon: 'text-violet-400' },
  noteUpdate: { wrapper: 'border-violet-500/25 bg-gradient-to-br from-violet-500/16 to-violet-500/6', icon: 'text-violet-300' },
  noteRead: { wrapper: 'border-violet-500/25 bg-gradient-to-br from-violet-500/14 to-violet-500/5', icon: 'text-violet-300/90' },
  noteList: { wrapper: 'border-border/50 bg-muted/35', icon: 'text-muted-foreground/80' },
  host: { wrapper: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/18 to-emerald-500/8', icon: 'text-emerald-400' },
  hostCreate: { wrapper: 'border-sky-500/30 bg-gradient-to-br from-sky-500/18 to-sky-500/8', icon: 'text-sky-400' },
  hostImport: { wrapper: 'border-amber-500/30 bg-gradient-to-br from-amber-500/18 to-amber-500/8', icon: 'text-amber-400' },
  hostList: { wrapper: 'border-border/50 bg-muted/35', icon: 'text-muted-foreground/80' },
  snippet: { wrapper: 'border-sky-500/30 bg-gradient-to-br from-sky-500/18 to-sky-500/8', icon: 'text-sky-400' },
  snippetCreate: { wrapper: 'border-sky-500/30 bg-gradient-to-br from-sky-500/18 to-sky-500/8', icon: 'text-sky-400' },
  snippetUpdate: { wrapper: 'border-sky-500/25 bg-gradient-to-br from-sky-500/14 to-sky-500/6', icon: 'text-sky-300' },
  snippetList: { wrapper: 'border-border/50 bg-muted/35', icon: 'text-muted-foreground/80' },
  snippetRun: { wrapper: 'border-sky-500/25 bg-gradient-to-br from-sky-500/14 to-sky-500/6', icon: 'text-sky-300' },
  snippetDeleted: { wrapper: 'border-border/45 bg-muted/30', icon: 'text-muted-foreground/65' },
  script: { wrapper: 'border-violet-500/30 bg-gradient-to-br from-violet-500/18 to-violet-500/8', icon: 'text-violet-400' },
  scriptCreate: { wrapper: 'border-violet-500/30 bg-gradient-to-br from-violet-500/18 to-violet-500/8', icon: 'text-violet-400' },
  scriptUpdate: { wrapper: 'border-violet-500/25 bg-gradient-to-br from-violet-500/14 to-violet-500/6', icon: 'text-violet-300' },
  scriptList: { wrapper: 'border-border/50 bg-muted/35', icon: 'text-muted-foreground/80' },
  scriptRun: { wrapper: 'border-violet-500/25 bg-gradient-to-br from-violet-500/14 to-violet-500/6', icon: 'text-violet-300' },
  scriptDeleted: { wrapper: 'border-border/45 bg-muted/30', icon: 'text-muted-foreground/65' },
  scriptRuns: { wrapper: 'border-border/50 bg-muted/35', icon: 'text-muted-foreground/80' },
  scriptAction: { wrapper: 'border-violet-500/25 bg-gradient-to-br from-violet-500/14 to-violet-500/6', icon: 'text-violet-300' },
  scriptReference: { wrapper: 'border-violet-500/25 bg-gradient-to-br from-violet-500/14 to-violet-500/6', icon: 'text-violet-300' },
  error: { wrapper: 'border-destructive/30 bg-gradient-to-br from-destructive/15 to-destructive/5', icon: 'text-destructive' },
};

export function resolveVaultArtifactVisualKind(
  artifact: VaultToolArtifact,
  toolName?: string,
): VaultArtifactVisualKind {
  if (artifact.kind === 'error') return 'error';

  if (artifact.kind === 'vault.note') {
    if (toolName === 'vault_notes_create') return 'noteCreate';
    if (toolName === 'vault_notes_update') return 'noteUpdate';
    return 'noteRead';
  }

  if (artifact.kind === 'vault.host') return 'host';

  if (artifact.kind === 'vault.hosts.batch') {
    if (artifact.sourceTool === 'vault_hosts_import' || toolName === 'vault_hosts_import') {
      return 'hostImport';
    }
    return 'hostCreate';
  }

  if (artifact.kind === 'vault.summary') {
    if (artifact.section === 'notes') return 'noteList';
    if (artifact.section === 'hosts') return 'hostList';
    if (artifact.section === 'snippets') return 'snippetList';
    return 'scriptList';
  }

  if (artifact.kind === 'vault.snippet') {
    if (toolName === 'snippets_create') return 'snippetCreate';
    if (toolName === 'snippets_update') return 'snippetUpdate';
    return 'snippet';
  }

  if (artifact.kind === 'vault.snippet.deleted') return 'snippetDeleted';
  if (artifact.kind === 'vault.snippet.run') return 'snippetRun';

  if (artifact.kind === 'vault.script') {
    if (toolName === 'scripts_create') return 'scriptCreate';
    if (toolName === 'scripts_update' || toolName === 'scripts_targets_set') return 'scriptUpdate';
    return 'script';
  }

  if (artifact.kind === 'vault.script.deleted') return 'scriptDeleted';
  if (artifact.kind === 'vault.script.run') return 'scriptRun';
  if (artifact.kind === 'vault.script.runs') return 'scriptRuns';
  if (artifact.kind === 'vault.script.action') return 'scriptAction';
  if (artifact.kind === 'vault.script.reference') return 'scriptReference';

  return 'host';
}

function renderVisualIcon(kind: VaultArtifactVisualKind): React.ReactNode {
  const className = VISUAL_STYLES[kind].icon;
  switch (kind) {
    case 'noteCreate':
      return <NotebookPen size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'noteUpdate':
      return <FilePenLine size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'noteRead':
      return <FileText size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'noteList':
      return <Library size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'host':
      return <Server size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'hostCreate':
      return <ServerCog size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'hostImport':
      return <FolderInput size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'hostList':
      return <LayoutGrid size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'snippet':
    case 'snippetCreate':
    case 'snippetUpdate':
    case 'snippetRun':
      return <Zap size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'snippetList':
      return <SquareTerminal size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'snippetDeleted':
      return <Trash2 size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'script':
    case 'scriptCreate':
    case 'scriptUpdate':
    case 'scriptReference':
      return <FileCode size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'scriptList':
    case 'scriptRuns':
      return <ListChecks size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'scriptRun':
      return <Play size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'scriptDeleted':
      return <Trash2 size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'scriptAction':
      return <Pause size={ARTIFACT_ICON_SIZE} className={className} />;
    case 'error':
      return <AlertCircle size={ARTIFACT_ICON_SIZE} className={className} />;
    default:
      return <BookOpen size={ARTIFACT_ICON_SIZE} className={className} />;
  }
}

export function VaultArtifactIcon({
  artifact,
  toolName,
}: {
  artifact: VaultToolArtifact;
  toolName?: string;
}) {
  const kind = resolveVaultArtifactVisualKind(artifact, toolName);
  const styles = VISUAL_STYLES[kind];

  return (
    <span
      className={cn(
        'magiesTerminal-ai-icon-plate magiesTerminal-ai-icon-plate--lg flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
        styles.wrapper,
      )}
    >
      {renderVisualIcon(kind)}
    </span>
  );
}
