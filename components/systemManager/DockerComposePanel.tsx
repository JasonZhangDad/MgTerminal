import { Boxes, ChevronLeft, Play, RotateCw, Square, Trash2 } from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../application/i18n/I18nProvider';
import type { useSystemManagerBackend } from '../../application/state/useSystemManagerBackend';
import type {
  DockerComposeProjectAction,
  DockerComposeProjectInfo,
  DockerComposeServiceInfo,
} from '../../domain/systemManager/types';
import { SystemPanelConfirmDialog } from './SystemPanelConfirmDialog';
import {
  SystemPanelActionChip,
  SystemPanelEmpty,
  SystemPanelError,
  SystemPanelList,
  SystemPanelLoading,
  SystemPanelMetaBar,
  SystemPanelRefreshButton,
  SystemPanelRow,
  SystemPanelSearch,
  SystemPanelShell,
  SystemPanelStatusBadge,
  SystemPanelToolbar,
} from './SystemPanelUi';
import { usePolling, useStableTranslate } from './hooks/useSystemManager';
import { showSystemManagerError } from './systemManagerToast';

type Backend = ReturnType<typeof useSystemManagerBackend>;

interface DockerComposePanelProps {
  sessionId: string;
  isVisible: boolean;
  backend: Backend;
  listRefreshIntervalSec: number;
}

function statusTone(status: string): 'success' | 'warning' | 'muted' {
  const normalized = status.toLowerCase();
  if (normalized.includes('running') || normalized === 'up') return 'success';
  if (normalized.includes('exit') || normalized.includes('dead')) return 'warning';
  return 'muted';
}

export const DockerComposePanel = memo(function DockerComposePanel({
  sessionId,
  isVisible,
  backend,
  listRefreshIntervalSec,
}: DockerComposePanelProps) {
  const { t } = useI18n();
  const stableT = useStableTranslate();
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<DockerComposeProjectInfo | null>(null);
  const [pendingAction, setPendingAction] = useState<DockerComposeProjectAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const intervalMs = Math.max(5, listRefreshIntervalSec) * 1000;

  const fetchProjects = useCallback(async () => {
    const result = await backend.listDockerComposeProjects(sessionId);
    if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadDockerCompose'));
    return result.projects ?? [];
  }, [backend, sessionId, stableT]);

  const fetchServices = useCallback(async () => {
    if (!selectedProject) return [];
    const result = await backend.listDockerComposeServices({
      sessionId,
      projectName: selectedProject.name,
      configFiles: selectedProject.configFiles,
    });
    if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadDockerCompose'));
    return result.services ?? [];
  }, [backend, selectedProject, sessionId, stableT]);

  const {
    data: projects,
    error: projectsError,
    loading: projectsLoading,
    refresh: refreshProjects,
  } = usePolling<DockerComposeProjectInfo[]>(
    fetchProjects,
    intervalMs,
    isVisible,
    undefined,
    { resetKey: sessionId },
  );

  const {
    data: services,
    error: servicesError,
    loading: servicesLoading,
    refresh: refreshServices,
  } = usePolling<DockerComposeServiceInfo[]>(
    fetchServices,
    intervalMs,
    isVisible && Boolean(selectedProject),
    undefined,
    { resetKey: `${sessionId}:${selectedProject?.name || ''}` },
  );

  useEffect(() => {
    if (!selectedProject || !projects) return;
    const current = projects.find((project) => project.name === selectedProject.name);
    if (!current) setSelectedProject(null);
    else if (current !== selectedProject) setSelectedProject(current);
  }, [projects, selectedProject]);

  useEffect(() => {
    setSelectedProject(null);
    setPendingAction(null);
  }, [sessionId]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects ?? [];
    return (projects ?? []).filter((project) => (
      project.name.toLowerCase().includes(query)
      || project.status.toLowerCase().includes(query)
      || project.configFiles.some((filePath) => filePath.toLowerCase().includes(query))
    ));
  }, [projects, search]);

  const runAction = useCallback(async () => {
    if (!selectedProject || !pendingAction) return;
    setActionBusy(true);
    try {
      const result = await backend.dockerComposeAction({
        sessionId,
        projectName: selectedProject.name,
        configFiles: selectedProject.configFiles,
        action: pendingAction,
      });
      if (!result.success) {
        showSystemManagerError(result.error || stableT('systemManager.errors.actionFailed'));
        return;
      }
      setPendingAction(null);
      void refreshProjects();
      void refreshServices();
    } catch (error) {
      showSystemManagerError(error instanceof Error ? error.message : String(error));
    } finally {
      setActionBusy(false);
    }
  }, [backend, pendingAction, refreshProjects, refreshServices, selectedProject, sessionId, stableT]);

  if (selectedProject) {
    return (
      <SystemPanelShell section="system-manager-docker-compose-detail">
        <SystemPanelToolbar>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={() => setSelectedProject(null)}
          >
            <ChevronLeft size={14} />
            {t('common.back')}
          </button>
          <div className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
            {selectedProject.name}
          </div>
          <SystemPanelRefreshButton
            title={t('history.action.refresh')}
            loading={servicesLoading}
            onClick={() => void refreshServices()}
          />
        </SystemPanelToolbar>
        <SystemPanelMetaBar
          trailing={(
            <span className="flex items-center gap-1">
              <SystemPanelActionChip title={t('systemManager.docker.compose.up')} onClick={() => setPendingAction('up')}>
                <Play size={11} /> {t('systemManager.docker.compose.up')}
              </SystemPanelActionChip>
              <SystemPanelActionChip title={t('systemManager.docker.compose.restart')} onClick={() => setPendingAction('restart')}>
                <RotateCw size={11} /> {t('systemManager.docker.compose.restart')}
              </SystemPanelActionChip>
              <SystemPanelActionChip destructive title={t('systemManager.docker.compose.down')} onClick={() => setPendingAction('down')}>
                <Trash2 size={11} /> {t('systemManager.docker.compose.down')}
              </SystemPanelActionChip>
            </span>
          )}
        >
          {selectedProject.configFiles.join(', ') || t('systemManager.docker.compose.noConfig')}
        </SystemPanelMetaBar>
        {servicesError && !services ? (
          <SystemPanelError
            message={servicesError}
            onRetry={() => void refreshServices()}
            retryLabel={t('history.action.retry')}
            loading={servicesLoading}
          />
        ) : servicesLoading && !services ? (
          <SystemPanelLoading message={t('systemManager.docker.compose.loadingServices')} />
        ) : !services?.length ? (
          <SystemPanelEmpty icon={Boxes} message={t('systemManager.docker.compose.emptyServices')} />
        ) : (
          <SystemPanelList>
            {services.map((service) => (
              <SystemPanelRow
                key={`${service.name}:${service.containerName}`}
                leading={(
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-500">
                    {service.state.toLowerCase() === 'running' ? <Play size={12} /> : <Square size={12} />}
                  </span>
                )}
                title={service.name || service.containerName}
                subtitle={[service.containerName, service.publishers].filter(Boolean).join(' · ')}
                trailing={(
                  <SystemPanelStatusBadge tone={statusTone(service.state || service.status)}>
                    {service.health || service.state || service.status || '—'}
                  </SystemPanelStatusBadge>
                )}
              />
            ))}
          </SystemPanelList>
        )}
        <SystemPanelConfirmDialog
          open={Boolean(pendingAction)}
          title={t('systemManager.docker.compose.confirmTitle')}
          message={t('systemManager.docker.compose.confirm', {
            action: pendingAction ? t(`systemManager.docker.compose.${pendingAction}`) : '',
            name: selectedProject.name,
          })}
          confirmLabel={pendingAction ? t(`systemManager.docker.compose.${pendingAction}`) : ''}
          destructive={pendingAction === 'down'}
          busy={actionBusy}
          onOpenChange={(open) => { if (!open && !actionBusy) setPendingAction(null); }}
          onConfirm={() => void runAction()}
        />
      </SystemPanelShell>
    );
  }

  return (
    <SystemPanelShell section="system-manager-docker-compose">
      <SystemPanelToolbar>
        <SystemPanelSearch
          value={search}
          onChange={setSearch}
          placeholder={t('systemManager.docker.compose.search')}
        />
        <SystemPanelRefreshButton
          title={t('history.action.refresh')}
          loading={projectsLoading}
          onClick={() => void refreshProjects()}
        />
      </SystemPanelToolbar>
      <SystemPanelMetaBar>{t('systemManager.docker.compose.meta', { count: filteredProjects.length })}</SystemPanelMetaBar>
      {projectsError && !projects ? (
        <SystemPanelError
          message={projectsError}
          onRetry={() => void refreshProjects()}
          retryLabel={t('history.action.retry')}
          loading={projectsLoading}
        />
      ) : projectsLoading && !projects ? (
        <SystemPanelLoading message={t('systemManager.docker.compose.loading')} />
      ) : filteredProjects.length === 0 ? (
        <SystemPanelEmpty icon={Boxes} message={t('systemManager.docker.compose.empty')} />
      ) : (
        <SystemPanelList>
          {filteredProjects.map((project) => (
            <SystemPanelRow
              key={project.name}
              onClick={() => setSelectedProject(project)}
              leading={(
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                  <Boxes size={13} />
                </span>
              )}
              title={project.name}
              subtitle={project.configFiles.join(', ') || t('systemManager.docker.compose.noConfig')}
              trailing={(
                <SystemPanelStatusBadge tone={statusTone(project.status)}>
                  {project.status || '—'}
                </SystemPanelStatusBadge>
              )}
            />
          ))}
        </SystemPanelList>
      )}
    </SystemPanelShell>
  );
});
