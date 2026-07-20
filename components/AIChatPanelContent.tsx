import React, { type Dispatch, type SetStateAction } from 'react';
import { History, Plus } from 'lucide-react';
import type { AIPermissionMode, AISession, ChatMessage, DiscoveredAgent, ExternalAgentConfig, AgentModelPreset, ProviderConfig, UploadedFile } from '../infrastructure/ai/types';
import type { Host, VaultNote } from '../types';
import type { UserSkillOption } from './ai/userSkillsState';
import type { AIQuickMessage } from '../infrastructure/ai/quickMessages';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import AgentSelector from './ai/AgentSelector';
import ChatInput from './ai/ChatInput';
import ChatMessageList from './ai/ChatMessageList';
import ConversationExport from './ai/ConversationExport';
import { SessionHistoryDrawer, formatRelativeTime } from './AIChatSessionHistoryDrawer';
import {
  getAIPanelDiagnosticHiddenParts,
  getAIPanelProfilerProps,
  isAIPanelDiagnosticPartHidden,
} from './ai/aiPanelDiagnostics';

type Translate = (key: string) => string;
type ExportFormat = 'md' | 'json' | 'txt';
type TerminalSessionSummary = {
  sessionId: string;
  hostname: string;
  label: string;
  connected: boolean;
};

interface AIChatPanelContentProps {
  t: Translate;
  currentAgentId: string;
  externalAgents: ExternalAgentConfig[];
  discoveredAgents: DiscoveredAgent[];
  isDiscovering: boolean;
  handleAgentChange: (agentId: string) => void;
  handleEnableDiscoveredAgent: (agent: DiscoveredAgent) => void;
  rediscover: () => void;
  handleOpenSettings: () => void;
  activeSession: AISession | null;
  handleExport: (format: ExportFormat) => void;
  showHistory: boolean;
  setShowHistory: Dispatch<SetStateAction<boolean>>;
  handleNewChat: () => void;
  historySessions: AISession[];
  activeSessionId: string | null;
  handleSelectSession: (sessionId: string) => void;
  handleDeleteSession: (event: React.MouseEvent, sessionId: string) => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  activeCompaction?: import('./ai/hooks/useAgentCompactionUi').ActiveCompactionUi | null;
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSend: () => void;
  handleStop: () => void;
  canSendCurrentAgent: boolean;
  providerDisplayName?: string;
  modelDisplayName?: string;
  agentModelPresets: AgentModelPreset[];
  selectedAgentModel: string;
  handleAgentModelSelect: (modelId: string) => void;
  magiesTerminalConfiguredProviders: ProviderConfig[];
  effectiveActiveProvider?: ProviderConfig;
  effectiveActiveModelId?: string;
  handleAgentProviderModelSelect: (providerId: string, modelId: string) => void;
  files: UploadedFile[];
  addFiles: (inputFiles: File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  terminalSessions: TerminalSessionSummary[];
  selectedUserSkills: UserSkillOption[];
  userSkillOptions: UserSkillOption[];
  quickMessages: AIQuickMessage[];
  addSelectedUserSkill: (slug: string) => void;
  removeSelectedUserSkill: (slug: string) => void;
  globalPermissionMode: AIPermissionMode;
  setGlobalPermissionMode?: (mode: AIPermissionMode) => void;
  notes?: VaultNote[];
  hosts?: Host[];
  onOpenVaultNote?: (noteId: string) => void;
  onOpenVaultHost?: (hostId: string) => void;
  onOpenVaultSection?: (section: 'notes' | 'hosts') => void;
}

export const AIChatPanelContent: React.FC<AIChatPanelContentProps> = ({
  t,
  currentAgentId,
  externalAgents,
  discoveredAgents,
  isDiscovering,
  handleAgentChange,
  handleEnableDiscoveredAgent,
  rediscover,
  handleOpenSettings,
  activeSession,
  handleExport,
  showHistory,
  setShowHistory,
  handleNewChat,
  historySessions,
  activeSessionId,
  handleSelectSession,
  handleDeleteSession,
  messages,
  isStreaming,
  activeCompaction = null,
  inputValue,
  setInputValue,
  handleSend,
  handleStop,
  canSendCurrentAgent,
  providerDisplayName,
  modelDisplayName,
  agentModelPresets,
  selectedAgentModel,
  handleAgentModelSelect,
  magiesTerminalConfiguredProviders,
  effectiveActiveProvider,
  effectiveActiveModelId,
  handleAgentProviderModelSelect,
  files,
  addFiles,
  removeFile,
  terminalSessions,
  selectedUserSkills,
  userSkillOptions,
  quickMessages,
  addSelectedUserSkill,
  removeSelectedUserSkill,
  globalPermissionMode,
  setGlobalPermissionMode,
  notes = [],
  hosts = [],
  onOpenVaultNote,
  onOpenVaultHost,
  onOpenVaultSection,
}) => {
  const hiddenParts = getAIPanelDiagnosticHiddenParts();
  const hideHeader = isAIPanelDiagnosticPartHidden('header', hiddenParts);
  const hideHistory = isAIPanelDiagnosticPartHidden('history', hiddenParts);
  const hideMessages = isAIPanelDiagnosticPartHidden('messages', hiddenParts);
  const hideRecent = isAIPanelDiagnosticPartHidden('recent', hiddenParts);
  const hideInput = isAIPanelDiagnosticPartHidden('input', hiddenParts);

  return (
    <div className="magiesTerminal-ai-panel flex h-full flex-col" data-section="ai-chat-panel">
      {/* ── Header — Claude-like minimal chrome ── */}
      {!hideHeader && (
        <React.Profiler {...getAIPanelProfilerProps('AIChatPanel.Header')}>
          <div className="magiesTerminal-ai-header flex shrink-0 items-center justify-between gap-2 px-3.5 py-2">
            <AgentSelector
              currentAgentId={currentAgentId}
              externalAgents={externalAgents}
              discoveredAgents={discoveredAgents}
              isDiscovering={isDiscovering}
              onSelectAgent={handleAgentChange}
              onEnableDiscoveredAgent={handleEnableDiscoveredAgent}
              onRediscover={rediscover}
              onManageAgents={handleOpenSettings}
            />
            <div className="flex items-center gap-0.5">
              <ConversationExport
                session={activeSession}
                onExport={handleExport}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('ai.chat.sessionHistory')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    onClick={handleNewChat}
                  >
                    <Plus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('ai.chat.newChat')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </React.Profiler>
      )}

      {/* ── Main content ── */}
      {showHistory && !hideHistory ? (
        <React.Profiler {...getAIPanelProfilerProps('AIChatPanel.History')}>
          <SessionHistoryDrawer
            sessions={historySessions}
            activeSessionId={activeSessionId}
            onSelect={handleSelectSession}
            onDelete={handleDeleteSession}
            onClose={() => setShowHistory(false)}
          />
        </React.Profiler>
      ) : (
        <>
          {/* Chat messages */}
          {!hideMessages && (
            <React.Profiler {...getAIPanelProfilerProps('AIChatPanel.Messages')}>
              <ChatMessageList
                messages={messages}
                isStreaming={isStreaming}
                activeSessionId={activeSessionId}
                activeCompaction={activeCompaction}
                notes={notes}
                hosts={hosts}
                onOpenVaultNote={onOpenVaultNote}
                onOpenVaultHost={onOpenVaultHost}
                onOpenVaultSection={onOpenVaultSection}
              />
            </React.Profiler>
          )}

          {/* Recent sessions (Zed-style, shown when no messages) */}
          {messages.length === 0 && historySessions.length > 0 && !hideRecent && (
            <React.Profiler {...getAIPanelProfilerProps('AIChatPanel.Recent')}>
              <div className="mx-auto w-full max-w-[44rem] shrink-0 px-5 pb-2 pt-1">
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <span className="text-[12px] font-medium text-muted-foreground/60">
                    {t('ai.chat.recent')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHistory(true)}
                    className="cursor-pointer text-[12px] text-muted-foreground/55 transition-colors duration-150 hover:text-foreground"
                  >
                    {t('ai.chat.viewAll')}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {historySessions.slice(0, 3).map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className="flex w-full cursor-pointer items-baseline justify-between rounded-xl px-2.5 py-2 text-left transition-colors duration-150 hover:bg-muted/50"
                    >
                      <span className="truncate pr-4 text-[13.5px] text-foreground/75">
                        {session.title || t('ai.chat.untitled')}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/45">
                        {formatRelativeTime(new Date(session.updatedAt), t)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </React.Profiler>
          )}

          {/* Input area */}
          {!hideInput && (
            <React.Profiler {...getAIPanelProfilerProps('AIChatPanel.Input')}>
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                onStop={handleStop}
                isStreaming={isStreaming}
                disabled={!canSendCurrentAgent}
                providerName={providerDisplayName}
                modelName={modelDisplayName}
                agentName={currentAgentId === 'magiesTerminal' ? 'MagiesTerminal Agent' : externalAgents.find(a => a.id === currentAgentId)?.name}
                modelPresets={agentModelPresets}
                selectedModelId={selectedAgentModel}
                onModelSelect={handleAgentModelSelect}
                providerSwitcher={
                  currentAgentId === 'magiesTerminal' && magiesTerminalConfiguredProviders.length > 0
                    ? {
                        providers: magiesTerminalConfiguredProviders,
                        selectedProviderId: effectiveActiveProvider?.id,
                        selectedModelId: effectiveActiveModelId || undefined,
                        onSelect: handleAgentProviderModelSelect,
                      }
                    : undefined
                }
                files={files}
                onAddFiles={addFiles}
                onRemoveFile={removeFile}
                hosts={terminalSessions.map(s => ({ sessionId: s.sessionId, hostname: s.hostname, label: s.label, connected: s.connected }))}
                selectedUserSkills={selectedUserSkills}
                userSkills={userSkillOptions}
                quickMessages={quickMessages}
                onAddUserSkill={addSelectedUserSkill}
                onRemoveUserSkill={removeSelectedUserSkill}
                permissionMode={globalPermissionMode}
                onPermissionModeChange={setGlobalPermissionMode}
              />
            </React.Profiler>
          )}
        </>
      )}

    </div>
  );
};
