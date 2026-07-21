import { Activity, Box, ChevronLeft, FileText, History, Info, Layers, Network, RotateCw, Scaling, SquareTerminal, Trash2 } from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../application/i18n/I18nProvider';
import type { useSystemManagerBackend } from '../../application/state/useSystemManagerBackend';
import type { TerminalSession } from '../../types';
import type {
  KubernetesDeploymentInfo,
  KubernetesEventInfo,
  KubernetesNamespaceInfo,
  KubernetesPodInfo,
} from '../../domain/systemManager/types';
import {
  buildKubernetesInteractiveExecCommand,
  buildKubernetesPortForwardCommand,
} from '../../domain/systemManager/kubernetesCommands';
import { cn } from '../../lib/utils';
import { SystemPanelConfirmDialog } from './SystemPanelConfirmDialog';
import { SystemPanelPromptDialog } from './SystemPanelPromptDialog';
import {
  SystemPanelEmpty,
  SystemPanelError,
  SystemPanelList,
  SystemPanelLoading,
  SystemPanelMetaBar,
  SystemPanelRefreshButton,
  SystemPanelRoundButton,
  SystemPanelRow,
  SystemPanelSearch,
  SystemPanelSegmented,
  SystemPanelShell,
  SystemPanelStatusBadge,
  SystemPanelToolbar,
} from './SystemPanelUi';
import { usePolling, useStableTranslate } from './hooks/useSystemManager';
import { showSystemManagerError } from './systemManagerToast';
import { openInteractiveTerminal } from './openInteractiveTerminal';

type Backend = ReturnType<typeof useSystemManagerBackend>;
type ResourceKind = 'pods' | 'deployments' | 'events';

interface KubernetesManagerTabProps {
  sessionId: string;
  parentSession: TerminalSession;
  isVisible: boolean;
  backend: Backend;
  refreshIntervalSec: number;
}

function podTone(status: string): 'success' | 'warning' | 'muted' {
  const s = status.toLowerCase();
  if (s === 'running' || s === 'succeeded' || s === 'completed') return 'success';
  if (s === 'pending' || s === 'containercreating' || s.includes('wait')) return 'warning';
  if (s === 'failed' || s === 'error' || s === 'crashloopbackoff' || s === 'imagepullbackoff') return 'warning';
  return 'muted';
}

/** READY is usually current/desired, e.g. "2/3". Prefer desired for scale prefill. */
function desiredReplicasFromReady(ready: string): string {
  const match = String(ready || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (match) return match[2];
  const single = String(ready || '').match(/^(\d+)$/);
  return single ? single[1] : '1';
}

function deploymentTone(ready: string): 'success' | 'warning' | 'muted' {
  const match = String(ready || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return 'muted';
  const current = Number(match[1]);
  const desired = Number(match[2]);
  if (desired === 0) return 'muted';
  if (current >= desired) return 'success';
  return 'warning';
}

export const KubernetesManagerTab = memo(function KubernetesManagerTab({
  sessionId,
  parentSession,
  isVisible,
  backend,
  refreshIntervalSec,
}: KubernetesManagerTabProps) {
  const { t } = useI18n();
  const stableT = useStableTranslate();
  const [resourceKind, setResourceKind] = useState<ResourceKind>('pods');
  const [namespace, setNamespace] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedPod, setSelectedPod] = useState<KubernetesPodInfo | null>(null);
  const [detailMode, setDetailMode] = useState<'logs' | 'describe' | null>(null);
  const [detailText, setDetailText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [contextName, setContextName] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KubernetesPodInfo | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleLoading, setScaleLoading] = useState(false);
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [scalePrefill, setScalePrefill] = useState<{
    name: string;
    namespace: string;
    replicas: string;
  } | null>(null);
  const [rolloutTarget, setRolloutTarget] = useState<KubernetesDeploymentInfo | null>(null);
  const [rolloutMode, setRolloutMode] = useState<'status' | 'history'>('status');
  const [rolloutText, setRolloutText] = useState('');
  const [rolloutLoading, setRolloutLoading] = useState(false);
  const [rolloutError, setRolloutError] = useState<string | null>(null);
  const [restartTarget, setRestartTarget] = useState<KubernetesDeploymentInfo | null>(null);
  const [restartLoading, setRestartLoading] = useState(false);
  const [execTarget, setExecTarget] = useState<KubernetesPodInfo | null>(null);
  const [portForwardTarget, setPortForwardTarget] = useState<KubernetesPodInfo | null>(null);
  const [terminalPopupLoading, setTerminalPopupLoading] = useState(false);

  const intervalMs = Math.max(5, refreshIntervalSec) * 1000;

  const fetchNamespaces = useCallback(async () => {
    const result = await backend.listKubernetesNamespaces(sessionId);
    if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadKubernetes'));
    return result.namespaces ?? [];
  }, [backend, sessionId, stableT]);

  const fetchPods = useCallback(async () => {
    const result = await backend.listKubernetesPods({
      sessionId,
      namespace: namespace === 'all' ? undefined : namespace,
    });
    if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadKubernetes'));
    return result.pods ?? [];
  }, [backend, namespace, sessionId, stableT]);

  const fetchDeployments = useCallback(async () => {
    const result = await backend.listKubernetesDeployments({
      sessionId,
      namespace: namespace === 'all' ? undefined : namespace,
    });
    if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadKubernetes'));
    return result.deployments ?? [];
  }, [backend, namespace, sessionId, stableT]);

  const fetchEvents = useCallback(async () => {
    const result = await backend.listKubernetesEvents({
      sessionId,
      namespace: namespace === 'all' ? undefined : namespace,
    });
    if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadKubernetesEvents'));
    return result.events ?? [];
  }, [backend, namespace, sessionId, stableT]);

  const {
    data: namespaces,
    error: nsError,
    loading: nsLoading,
    refresh: refreshNs,
  } = usePolling<KubernetesNamespaceInfo[]>(
    fetchNamespaces,
    intervalMs * 3,
    isVisible,
    undefined,
    { resetKey: sessionId },
  );

  const {
    data: pods,
    error: podsError,
    loading: podsLoading,
    refresh: refreshPods,
  } = usePolling<KubernetesPodInfo[]>(
    fetchPods,
    intervalMs,
    isVisible && resourceKind === 'pods',
    undefined,
    { resetKey: `${sessionId}:${namespace}:pods` },
  );

  const {
    data: deployments,
    error: deploymentsError,
    loading: deploymentsLoading,
    refresh: refreshDeployments,
  } = usePolling<KubernetesDeploymentInfo[]>(
    fetchDeployments,
    intervalMs,
    isVisible && resourceKind === 'deployments',
    undefined,
    { resetKey: `${sessionId}:${namespace}:deployments` },
  );

  const {
    data: events,
    error: eventsError,
    loading: eventsLoading,
    refresh: refreshEvents,
  } = usePolling<KubernetesEventInfo[]>(
    fetchEvents,
    intervalMs,
    isVisible && resourceKind === 'events',
    undefined,
    { resetKey: `${sessionId}:${namespace}:events` },
  );

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    void backend.getKubernetesCurrentContext(sessionId).then((result) => {
      if (cancelled) return;
      if (result.success) setContextName(result.context ?? null);
    });
    return () => { cancelled = true; };
  }, [backend, isVisible, sessionId]);

  useEffect(() => {
    setSelectedPod(null);
    setDetailMode(null);
    setDetailText('');
    setDetailError(null);
    setRolloutTarget(null);
    setRolloutText('');
    setRolloutError(null);
  }, [sessionId, namespace, resourceKind]);

  const filteredPods = useMemo(() => {
    const list = pods ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((pod) => (
      pod.name.toLowerCase().includes(q)
      || pod.namespace.toLowerCase().includes(q)
      || pod.status.toLowerCase().includes(q)
      || pod.node.toLowerCase().includes(q)
    ));
  }, [pods, search]);

  const filteredDeployments = useMemo(() => {
    const list = deployments ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((dep) => (
      dep.name.toLowerCase().includes(q)
      || dep.namespace.toLowerCase().includes(q)
      || dep.ready.toLowerCase().includes(q)
    ));
  }, [deployments, search]);

  const filteredEvents = useMemo(() => {
    const list = events ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((event) => (
      event.reason.toLowerCase().includes(q)
      || event.message.toLowerCase().includes(q)
      || event.namespace.toLowerCase().includes(q)
      || event.objectName.toLowerCase().includes(q)
    ));
  }, [events, search]);

  const nsOptions = useMemo(() => {
    const opts = [{ id: 'all', label: t('systemManager.kubernetes.namespaceAll') }];
    for (const ns of namespaces ?? []) {
      opts.push({ id: ns.name, label: ns.name });
    }
    return opts;
  }, [namespaces, t]);

  const resourceOptions = useMemo(() => ([
    { id: 'pods' as const, label: t('systemManager.kubernetes.resourcePods') },
    { id: 'deployments' as const, label: t('systemManager.kubernetes.resourceDeployments') },
    { id: 'events' as const, label: t('systemManager.kubernetes.resourceEvents') },
  ]), [t]);

  const openScaleDialog = useCallback((prefill?: {
    name?: string;
    namespace?: string;
    replicas?: string;
  }) => {
    setScaleError(null);
    setScalePrefill({
      name: prefill?.name || '',
      namespace: prefill?.namespace || (namespace === 'all' ? 'default' : namespace),
      replicas: prefill?.replicas || '1',
    });
    setScaleOpen(true);
  }, [namespace]);

  const confirmDeletePod = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const result = await backend.deleteKubernetesPod({
        sessionId,
        namespace: deleteTarget.namespace,
        pod: deleteTarget.name,
      });
      if (!result.success) {
        showSystemManagerError(result.error || stableT('systemManager.errors.actionFailed'));
        return;
      }
      setDeleteTarget(null);
      void refreshPods();
    } catch (err) {
      showSystemManagerError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  }, [backend, deleteTarget, refreshPods, sessionId, stableT]);

  const scaleFields = useMemo(() => ([
    {
      id: 'name',
      label: t('systemManager.kubernetes.scaleDeployment'),
      placeholder: t('systemManager.kubernetes.scaleDeploymentPlaceholder'),
      initialValue: scalePrefill?.name || '',
      mono: true,
    },
    {
      id: 'namespace',
      label: t('systemManager.kubernetes.scaleNamespace'),
      placeholder: 'default',
      initialValue: scalePrefill?.namespace || (namespace === 'all' ? 'default' : namespace),
      mono: true,
    },
    {
      id: 'replicas',
      label: t('systemManager.kubernetes.scaleReplicas'),
      placeholder: t('systemManager.kubernetes.scaleReplicasPlaceholder'),
      initialValue: scalePrefill?.replicas || '1',
      mono: true,
    },
  ]), [namespace, scalePrefill, t]);

  const validateScale = useCallback((values: Record<string, string>) => {
    const name = (values.name || '').trim();
    if (!name || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
      return stableT('systemManager.kubernetes.scaleInvalidName');
    }
    const ns = (values.namespace || '').trim() || 'default';
    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(ns)) {
      return stableT('systemManager.kubernetes.scaleInvalidName');
    }
    const replicas = Number(values.replicas);
    if (!Number.isFinite(replicas) || !Number.isInteger(replicas) || replicas < 0 || replicas > 1000) {
      return stableT('systemManager.kubernetes.scaleInvalidReplicas');
    }
    return null;
  }, [stableT]);

  const confirmScale = useCallback(async (values: Record<string, string>) => {
    setScaleLoading(true);
    setScaleError(null);
    try {
      const result = await backend.scaleKubernetesDeployment({
        sessionId,
        name: values.name.trim(),
        namespace: (values.namespace || '').trim() || 'default',
        replicas: Number(values.replicas),
      });
      if (!result.success) {
        const message = result.error || stableT('systemManager.errors.actionFailed');
        setScaleError(message);
        showSystemManagerError(message);
        return;
      }
      setScaleOpen(false);
      setScalePrefill(null);
      void refreshPods();
      void refreshDeployments();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setScaleError(message);
      showSystemManagerError(message);
    } finally {
      setScaleLoading(false);
    }
  }, [backend, refreshDeployments, refreshPods, sessionId, stableT]);

  const loadDetail = useCallback(async (pod: KubernetesPodInfo, mode: 'logs' | 'describe') => {
    setSelectedPod(pod);
    setDetailMode(mode);
    setDetailLoading(true);
    setDetailError(null);
    setDetailText('');
    try {
      if (mode === 'logs') {
        const result = await backend.getKubernetesPodLogs({
          sessionId,
          namespace: pod.namespace,
          pod: pod.name,
          tailLines: 200,
        });
        if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadKubernetesLogs'));
        setDetailText(result.logs || '');
      } else {
        const result = await backend.describeKubernetesPod({
          sessionId,
          namespace: pod.namespace,
          pod: pod.name,
        });
        if (!result.success) throw new Error(result.error || stableT('systemManager.errors.loadKubernetesDescribe'));
        setDetailText(result.describe || '');
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }, [backend, sessionId, stableT]);

  const loadRollout = useCallback(async (
    deployment: KubernetesDeploymentInfo,
    mode: 'status' | 'history',
  ) => {
    setRolloutTarget(deployment);
    setRolloutMode(mode);
    setRolloutLoading(true);
    setRolloutError(null);
    setRolloutText('');
    try {
      const options = {
        sessionId,
        namespace: deployment.namespace,
        name: deployment.name,
      };
      const result = mode === 'status'
        ? await backend.getKubernetesDeploymentRolloutStatus(options)
        : await backend.getKubernetesDeploymentRolloutHistory(options);
      if (!result.success) {
        throw new Error(result.error || stableT('systemManager.errors.loadKubernetesRollout'));
      }
      setRolloutText(result.output || '');
    } catch (error) {
      setRolloutError(error instanceof Error ? error.message : String(error));
    } finally {
      setRolloutLoading(false);
    }
  }, [backend, sessionId, stableT]);

  const confirmRestartRollout = useCallback(async () => {
    if (!restartTarget) return;
    setRestartLoading(true);
    try {
      const result = await backend.restartKubernetesDeploymentRollout({
        sessionId,
        namespace: restartTarget.namespace,
        name: restartTarget.name,
      });
      if (!result.success) {
        showSystemManagerError(result.error || stableT('systemManager.errors.actionFailed'));
        return;
      }
      setRestartTarget(null);
      void refreshDeployments();
    } catch (error) {
      showSystemManagerError(error instanceof Error ? error.message : String(error));
    } finally {
      setRestartLoading(false);
    }
  }, [backend, refreshDeployments, restartTarget, sessionId, stableT]);

  const openPodExec = useCallback(async (values: Record<string, string>) => {
    if (!execTarget) return;
    const command = buildKubernetesInteractiveExecCommand({
      namespace: execTarget.namespace,
      pod: execTarget.name,
      container: values.container || undefined,
    });
    if (!command) {
      showSystemManagerError(stableT('systemManager.kubernetes.invalidExecTarget'));
      return;
    }
    setTerminalPopupLoading(true);
    try {
      const result = await openInteractiveTerminal(
        backend,
        parentSession,
        `kubectl exec: ${execTarget.name}`,
        command,
      );
      if (!result.success) showSystemManagerError(result.error || stableT('systemManager.errors.actionFailed'));
      else setExecTarget(null);
    } catch (error) {
      showSystemManagerError(error instanceof Error ? error.message : String(error));
    } finally {
      setTerminalPopupLoading(false);
    }
  }, [backend, execTarget, parentSession, stableT]);

  const openPodPortForward = useCallback(async (values: Record<string, string>) => {
    if (!portForwardTarget) return;
    const command = buildKubernetesPortForwardCommand({
      namespace: portForwardTarget.namespace,
      pod: portForwardTarget.name,
      localPort: Number(values.localPort),
      remotePort: Number(values.remotePort),
    });
    if (!command) {
      showSystemManagerError(stableT('systemManager.kubernetes.invalidPorts'));
      return;
    }
    setTerminalPopupLoading(true);
    try {
      const result = await openInteractiveTerminal(
        backend,
        parentSession,
        `kubectl port-forward: ${portForwardTarget.name}`,
        command,
      );
      if (!result.success) showSystemManagerError(result.error || stableT('systemManager.errors.actionFailed'));
      else setPortForwardTarget(null);
    } catch (error) {
      showSystemManagerError(error instanceof Error ? error.message : String(error));
    } finally {
      setTerminalPopupLoading(false);
    }
  }, [backend, parentSession, portForwardTarget, stableT]);

  const execFields = useMemo(() => ([{
    id: 'container',
    label: t('systemManager.kubernetes.container'),
    placeholder: t('systemManager.kubernetes.containerOptional'),
    initialValue: '',
    required: false,
    mono: true,
  }]), [t]);

  const portForwardFields = useMemo(() => ([
    {
      id: 'localPort',
      label: t('systemManager.kubernetes.localPort'),
      placeholder: '8080',
      initialValue: '8080',
      mono: true,
    },
    {
      id: 'remotePort',
      label: t('systemManager.kubernetes.remotePort'),
      placeholder: '80',
      initialValue: '80',
      mono: true,
    },
  ]), [t]);

  const listLoading = resourceKind === 'pods'
    ? (podsLoading && !pods)
    : resourceKind === 'deployments'
      ? (deploymentsLoading && !deployments)
      : (eventsLoading && !events);
  const listError = resourceKind === 'pods'
    ? podsError
    : resourceKind === 'deployments'
      ? deploymentsError
      : eventsError;
  const listRefreshing = resourceKind === 'pods'
    ? podsLoading
    : resourceKind === 'deployments'
      ? deploymentsLoading
      : eventsLoading;
  const loading = listLoading || (nsLoading && !namespaces);
  const error = listError || nsError;
  const filteredCount = resourceKind === 'pods'
    ? filteredPods.length
    : resourceKind === 'deployments'
      ? filteredDeployments.length
      : filteredEvents.length;
  const totalCount = resourceKind === 'pods'
    ? pods?.length
    : resourceKind === 'deployments'
      ? deployments?.length
      : events?.length;
  const listData = resourceKind === 'pods'
    ? pods
    : resourceKind === 'deployments'
      ? deployments
      : events;

  const handleRefresh = useCallback(() => {
    void refreshNs();
    if (resourceKind === 'pods') void refreshPods();
    else if (resourceKind === 'deployments') void refreshDeployments();
    else void refreshEvents();
  }, [refreshDeployments, refreshEvents, refreshNs, refreshPods, resourceKind]);

  if (detailMode && selectedPod) {
    return (
      <SystemPanelShell section="system-manager-kubernetes-detail">
        <SystemPanelToolbar>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={() => {
              setDetailMode(null);
              setDetailText('');
              setDetailError(null);
            }}
          >
            <ChevronLeft size={14} />
            {t('common.back')}
          </button>
          <div className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
            {selectedPod.namespace}/{selectedPod.name}
          </div>
          <SystemPanelRefreshButton
            title={t('history.action.refresh')}
            loading={detailLoading}
            onClick={() => void loadDetail(selectedPod, detailMode)}
          />
        </SystemPanelToolbar>
        <SystemPanelMetaBar>
          {detailMode === 'logs'
            ? t('systemManager.kubernetes.logsTitle')
            : t('systemManager.kubernetes.describeTitle')}
        </SystemPanelMetaBar>
        {detailLoading && !detailText ? (
          <SystemPanelLoading message={t('systemManager.kubernetes.loadingDetail')} />
        ) : detailError && !detailText ? (
          <SystemPanelError
            message={detailError}
            onRetry={() => void loadDetail(selectedPod, detailMode)}
            retryLabel={t('history.action.retry')}
          />
        ) : (
          <pre className="flex-1 min-h-0 overflow-auto px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
            {detailText || t('systemManager.kubernetes.emptyDetail')}
          </pre>
        )}
      </SystemPanelShell>
    );
  }

  if (rolloutTarget) {
    return (
      <SystemPanelShell section="system-manager-kubernetes-rollout">
        <SystemPanelToolbar>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={() => {
              setRolloutTarget(null);
              setRolloutText('');
              setRolloutError(null);
            }}
          >
            <ChevronLeft size={14} />
            {t('common.back')}
          </button>
          <div className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
            {rolloutTarget.namespace}/{rolloutTarget.name}
          </div>
          <SystemPanelRoundButton
            title={t('systemManager.kubernetes.rolloutRestart')}
            onClick={() => setRestartTarget(rolloutTarget)}
          >
            <RotateCw size={12} />
          </SystemPanelRoundButton>
          <SystemPanelRefreshButton
            title={t('history.action.refresh')}
            loading={rolloutLoading}
            onClick={() => void loadRollout(rolloutTarget, rolloutMode)}
          />
        </SystemPanelToolbar>
        <SystemPanelSegmented
          value={rolloutMode}
          options={[
            { id: 'status', label: t('systemManager.kubernetes.rolloutStatus') },
            { id: 'history', label: t('systemManager.kubernetes.rolloutHistory') },
          ]}
          onChange={(mode) => void loadRollout(rolloutTarget, mode)}
        />
        {rolloutLoading && !rolloutText ? (
          <SystemPanelLoading message={t('systemManager.kubernetes.loadingDetail')} />
        ) : rolloutError && !rolloutText ? (
          <SystemPanelError
            message={rolloutError}
            onRetry={() => void loadRollout(rolloutTarget, rolloutMode)}
            retryLabel={t('history.action.retry')}
          />
        ) : (
          <pre className="flex-1 min-h-0 overflow-auto px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
            {rolloutText || t('systemManager.kubernetes.emptyDetail')}
          </pre>
        )}
        <SystemPanelConfirmDialog
          open={Boolean(restartTarget)}
          title={t('systemManager.kubernetes.rolloutRestart')}
          message={t('systemManager.kubernetes.rolloutRestartConfirm', { name: rolloutTarget.name })}
          confirmLabel={t('systemManager.kubernetes.rolloutRestart')}
          busy={restartLoading}
          onOpenChange={(open) => { if (!open && !restartLoading) setRestartTarget(null); }}
          onConfirm={() => void confirmRestartRollout()}
        />
      </SystemPanelShell>
    );
  }

  return (
    <SystemPanelShell section="system-manager-kubernetes">
      <SystemPanelToolbar>
        <SystemPanelSearch
          value={search}
          onChange={setSearch}
          placeholder={
            resourceKind === 'pods'
              ? t('systemManager.kubernetes.search')
              : resourceKind === 'deployments'
                ? t('systemManager.kubernetes.searchDeployments')
                : t('systemManager.kubernetes.searchEvents')
          }
        />
        {resourceKind === 'deployments' && (
          <SystemPanelRoundButton
            title={t('systemManager.kubernetes.scale')}
            onClick={() => openScaleDialog()}
          >
            <Scaling size={12} />
          </SystemPanelRoundButton>
        )}
        <SystemPanelRefreshButton
          title={t('history.action.refresh')}
          loading={listRefreshing}
          onClick={handleRefresh}
        />
      </SystemPanelToolbar>

      <SystemPanelMetaBar
        trailing={(
          <span className="font-mono text-[10px] tabular-nums">
            {filteredCount}
            {typeof totalCount === 'number' ? ` / ${totalCount}` : ''}
          </span>
        )}
      >
        {contextName
          ? t('systemManager.kubernetes.context', { name: contextName })
          : t('systemManager.kubernetes.contextUnknown')}
      </SystemPanelMetaBar>

      <SystemPanelSegmented
        value={resourceKind}
        options={resourceOptions}
        onChange={setResourceKind}
      />

      <SystemPanelSegmented
        value={namespace}
        options={nsOptions}
        onChange={setNamespace}
      />

      {error && !listData ? (
        <SystemPanelError
          message={error}
          onRetry={handleRefresh}
          retryLabel={t('history.action.retry')}
          loading={listRefreshing}
        />
      ) : loading ? (
        <SystemPanelLoading
          message={
            resourceKind === 'pods'
              ? t('systemManager.kubernetes.loading')
              : resourceKind === 'deployments'
                ? t('systemManager.kubernetes.loadingDeployments')
                : t('systemManager.kubernetes.loadingEvents')
          }
        />
      ) : resourceKind === 'pods' ? (
        filteredPods.length === 0 ? (
          <SystemPanelEmpty icon={Layers} message={t('systemManager.kubernetes.empty')} />
        ) : (
          <SystemPanelList>
            {filteredPods.map((pod) => (
              <SystemPanelRow
                key={`${pod.namespace}/${pod.name}`}
                leading={(
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-500">
                    <Box size={13} />
                  </span>
                )}
                title={pod.name}
                subtitle={`${pod.namespace} · ${pod.ready} · node ${pod.node || '—'}`}
                trailing={(
                  <div className="flex shrink-0 items-center gap-1">
                    <SystemPanelStatusBadge tone={podTone(pod.status)}>
                      {pod.status || '—'}
                    </SystemPanelStatusBadge>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.logs')}
                      onClick={() => void loadDetail(pod, 'logs')}
                    >
                      <FileText size={12} />
                    </SystemPanelRoundButton>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.describe')}
                      onClick={() => void loadDetail(pod, 'describe')}
                    >
                      <Info size={12} />
                    </SystemPanelRoundButton>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.exec')}
                      onClick={() => setExecTarget(pod)}
                    >
                      <SquareTerminal size={12} />
                    </SystemPanelRoundButton>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.portForward')}
                      onClick={() => setPortForwardTarget(pod)}
                    >
                      <Network size={12} />
                    </SystemPanelRoundButton>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.delete')}
                      destructive
                      onClick={() => setDeleteTarget(pod)}
                    >
                      <Trash2 size={12} />
                    </SystemPanelRoundButton>
                  </div>
                )}
              />
            ))}
          </SystemPanelList>
        )
      ) : resourceKind === 'deployments' ? (
        filteredDeployments.length === 0 ? (
          <SystemPanelEmpty icon={Layers} message={t('systemManager.kubernetes.emptyDeployments')} />
        ) : (
          <SystemPanelList>
            {filteredDeployments.map((dep) => (
              <SystemPanelRow
                key={`${dep.namespace}/${dep.name}`}
                leading={(
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
                    <Layers size={13} />
                  </span>
                )}
                title={dep.name}
                subtitle={`${dep.namespace} · ready ${dep.ready} · up-to-date ${dep.upToDate} · age ${dep.age || '—'}`}
                trailing={(
                  <div className="flex shrink-0 items-center gap-1">
                    <SystemPanelStatusBadge tone={deploymentTone(dep.ready)}>
                      {dep.ready || '—'}
                    </SystemPanelStatusBadge>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.rollout')}
                      onClick={() => void loadRollout(dep, 'status')}
                    >
                      <History size={12} />
                    </SystemPanelRoundButton>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.rolloutRestart')}
                      onClick={() => setRestartTarget(dep)}
                    >
                      <RotateCw size={12} />
                    </SystemPanelRoundButton>
                    <SystemPanelRoundButton
                      title={t('systemManager.kubernetes.scale')}
                      onClick={() => openScaleDialog({
                        name: dep.name,
                        namespace: dep.namespace,
                        replicas: desiredReplicasFromReady(dep.ready),
                      })}
                    >
                      <Scaling size={12} />
                    </SystemPanelRoundButton>
                  </div>
                )}
              />
            ))}
          </SystemPanelList>
        )
      ) : filteredEvents.length === 0 ? (
        <SystemPanelEmpty icon={Activity} message={t('systemManager.kubernetes.emptyEvents')} />
      ) : (
        <SystemPanelList>
          {filteredEvents.map((event) => (
            <SystemPanelRow
              key={`${event.namespace}/${event.name}/${event.lastSeen}`}
              leading={(
                <span className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-md',
                  event.type.toLowerCase() === 'warning'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-emerald-500/10 text-emerald-500',
                )}>
                  <Activity size={13} />
                </span>
              )}
              title={event.reason || event.objectName || event.name}
              subtitle={`${event.namespace} · ${event.objectKind}/${event.objectName} · ${event.message}`}
              trailing={(
                <SystemPanelStatusBadge tone={event.type.toLowerCase() === 'warning' ? 'warning' : 'muted'}>
                  {event.count > 1 ? `${event.type} ×${event.count}` : event.type}
                </SystemPanelStatusBadge>
              )}
            />
          ))}
        </SystemPanelList>
      )}

      <div className={cn('shrink-0 border-t border-border/40 px-3 py-1.5 text-[10px] text-muted-foreground')}>
        {t('systemManager.kubernetes.writeNote')}
      </div>

      <SystemPanelConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('systemManager.kubernetes.deleteTitle')}
        message={
          deleteTarget
            ? t('systemManager.kubernetes.deleteConfirm', {
                name: `${deleteTarget.namespace}/${deleteTarget.name}`,
              })
            : ''
        }
        confirmLabel={t('systemManager.kubernetes.delete')}
        destructive
        busy={deleteLoading}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeletePod()}
      />

      <SystemPanelConfirmDialog
        open={Boolean(restartTarget)}
        title={t('systemManager.kubernetes.rolloutRestart')}
        message={restartTarget
          ? t('systemManager.kubernetes.rolloutRestartConfirm', { name: restartTarget.name })
          : ''}
        confirmLabel={t('systemManager.kubernetes.rolloutRestart')}
        busy={restartLoading}
        onOpenChange={(open) => { if (!open && !restartLoading) setRestartTarget(null); }}
        onConfirm={() => void confirmRestartRollout()}
      />

      <SystemPanelPromptDialog
        open={scaleOpen}
        title={t('systemManager.kubernetes.scaleTitle')}
        fields={scaleFields}
        confirmLabel={t('systemManager.kubernetes.scaleConfirm')}
        busy={scaleLoading}
        error={scaleError}
        validate={validateScale}
        onOpenChange={(open) => {
          if (!open && !scaleLoading) {
            setScaleOpen(false);
            setScaleError(null);
            setScalePrefill(null);
          }
        }}
        onSubmit={(values) => void confirmScale(values)}
      />

      <SystemPanelPromptDialog
        open={Boolean(execTarget)}
        title={execTarget
          ? t('systemManager.kubernetes.execTitle', { name: execTarget.name })
          : t('systemManager.kubernetes.exec')}
        fields={execFields}
        confirmLabel={t('systemManager.kubernetes.exec')}
        busy={terminalPopupLoading}
        onOpenChange={(open) => { if (!open && !terminalPopupLoading) setExecTarget(null); }}
        onSubmit={(values) => void openPodExec(values)}
      />

      <SystemPanelPromptDialog
        open={Boolean(portForwardTarget)}
        title={portForwardTarget
          ? t('systemManager.kubernetes.portForwardTitle', { name: portForwardTarget.name })
          : t('systemManager.kubernetes.portForward')}
        fields={portForwardFields}
        confirmLabel={t('systemManager.kubernetes.portForward')}
        busy={terminalPopupLoading}
        validate={(values) => (
          buildKubernetesPortForwardCommand({
            namespace: portForwardTarget?.namespace || '',
            pod: portForwardTarget?.name || '',
            localPort: Number(values.localPort),
            remotePort: Number(values.remotePort),
          })
            ? null
            : stableT('systemManager.kubernetes.invalidPorts')
        )}
        onOpenChange={(open) => { if (!open && !terminalPopupLoading) setPortForwardTarget(null); }}
        onSubmit={(values) => void openPodPortForward(values)}
      />
    </SystemPanelShell>
  );
});
