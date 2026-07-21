import { Box, ChevronLeft, FileText, Info, Layers, Scaling, Trash2 } from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../application/i18n/I18nProvider';
import type { useSystemManagerBackend } from '../../application/state/useSystemManagerBackend';
import type {
  KubernetesDeploymentInfo,
  KubernetesNamespaceInfo,
  KubernetesPodInfo,
} from '../../domain/systemManager/types';
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

type Backend = ReturnType<typeof useSystemManagerBackend>;
type ResourceKind = 'pods' | 'deployments';

interface KubernetesManagerTabProps {
  sessionId: string;
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

  const listLoading = resourceKind === 'pods'
    ? (podsLoading && !pods)
    : (deploymentsLoading && !deployments);
  const listError = resourceKind === 'pods' ? podsError : deploymentsError;
  const listRefreshing = resourceKind === 'pods' ? podsLoading : deploymentsLoading;
  const loading = listLoading || (nsLoading && !namespaces);
  const error = listError || nsError;
  const filteredCount = resourceKind === 'pods' ? filteredPods.length : filteredDeployments.length;
  const totalCount = resourceKind === 'pods' ? pods?.length : deployments?.length;

  const handleRefresh = useCallback(() => {
    void refreshNs();
    if (resourceKind === 'pods') void refreshPods();
    else void refreshDeployments();
  }, [refreshDeployments, refreshNs, refreshPods, resourceKind]);

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

  return (
    <SystemPanelShell section="system-manager-kubernetes">
      <SystemPanelToolbar>
        <SystemPanelSearch
          value={search}
          onChange={setSearch}
          placeholder={
            resourceKind === 'pods'
              ? t('systemManager.kubernetes.search')
              : t('systemManager.kubernetes.searchDeployments')
          }
        />
        <SystemPanelRoundButton
          title={t('systemManager.kubernetes.scale')}
          onClick={() => openScaleDialog()}
        >
          <Scaling size={12} />
        </SystemPanelRoundButton>
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

      {error && !(resourceKind === 'pods' ? pods : deployments) ? (
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
              : t('systemManager.kubernetes.loadingDeployments')
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
      ) : filteredDeployments.length === 0 ? (
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
    </SystemPanelShell>
  );
});
