import { useCallback, useMemo } from 'react';
import type { DockerContainerAction, DockerImageManageAction, TmuxManageAction } from '../../domain/systemManager/types';
import { magiesTerminalBridge } from '../../infrastructure/services/magiesTerminalBridge';

export function useSystemManagerBackend() {
  const probeSystemCapabilities = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.probeSystemCapabilities) {
      return { success: false as const, error: 'probeSystemCapabilities unavailable' };
    }
    return bridge.probeSystemCapabilities(sessionId);
  }, []);

  const listSystemProcesses = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listSystemProcesses) {
      return { success: false as const, error: 'listSystemProcesses unavailable' };
    }
    return bridge.listSystemProcesses(sessionId);
  }, []);

  const signalSystemProcess = useCallback(async (options: {
    sessionId: string;
    pid: number;
    signal?: string;
    nice?: number;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.signalSystemProcess) {
      return { success: false as const, error: 'signalSystemProcess unavailable' };
    }
    return bridge.signalSystemProcess(options);
  }, []);

  const listTmuxSessions = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listTmuxSessions) {
      return { success: false as const, error: 'listTmuxSessions unavailable' };
    }
    return bridge.listTmuxSessions(sessionId);
  }, []);

  const createTmuxSession = useCallback(async (options: {
    sessionId: string;
    name: string;
    command?: string;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.createTmuxSession) {
      return { success: false as const, error: 'createTmuxSession unavailable' };
    }
    return bridge.createTmuxSession(options);
  }, []);

  const listTmuxWindows = useCallback(async (options: { sessionId: string; sessionName: string }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listTmuxWindows) {
      return { success: false as const, error: 'listTmuxWindows unavailable' };
    }
    return bridge.listTmuxWindows(options);
  }, []);

  const listTmuxPanes = useCallback(async (options: {
    sessionId: string;
    sessionName: string;
    windowIndex: number;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listTmuxPanes) {
      return { success: false as const, error: 'listTmuxPanes unavailable' };
    }
    return bridge.listTmuxPanes(options);
  }, []);

  const listTmuxClients = useCallback(async (options: { sessionId: string; sessionName?: string }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listTmuxClients) {
      return { success: false as const, error: 'listTmuxClients unavailable' };
    }
    return bridge.listTmuxClients(options);
  }, []);

  const tmuxAction = useCallback(async (options: { sessionId: string } & TmuxManageAction) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.tmuxAction) {
      return { success: false as const, error: 'tmuxAction unavailable' };
    }
    return bridge.tmuxAction(options);
  }, []);

  const listDockerContainers = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listDockerContainers) {
      return { success: false as const, error: 'listDockerContainers unavailable' };
    }
    return bridge.listDockerContainers(sessionId);
  }, []);

  const listDockerImages = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listDockerImages) {
      return { success: false as const, error: 'listDockerImages unavailable' };
    }
    return bridge.listDockerImages(sessionId);
  }, []);

  const getDockerStats = useCallback(async (options: { sessionId: string; ids?: string[] }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.getDockerStats) {
      return { success: false as const, error: 'getDockerStats unavailable' };
    }
    return bridge.getDockerStats(options);
  }, []);

  const dockerInspect = useCallback(async (options: { sessionId: string; containerId: string }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.dockerInspect) {
      return { success: false as const, error: 'dockerInspect unavailable' };
    }
    return bridge.dockerInspect(options);
  }, []);

  const dockerImageInspect = useCallback(async (options: { sessionId: string; imageId: string }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.dockerImageInspect) {
      return { success: false as const, error: 'dockerImageInspect unavailable' };
    }
    return bridge.dockerImageInspect(options);
  }, []);

  const dockerAction = useCallback(async (options: {
    sessionId: string;
    containerId: string;
    action: DockerContainerAction;
    newName?: string;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.dockerAction) {
      return { success: false as const, error: 'dockerAction unavailable' };
    }
    return bridge.dockerAction(options);
  }, []);

  const dockerImageAction = useCallback(async (options: { sessionId: string } & DockerImageManageAction) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.dockerImageAction) {
      return { success: false as const, error: 'dockerImageAction unavailable' };
    }
    return bridge.dockerImageAction(options);
  }, []);

  const listKubernetesNamespaces = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listKubernetesNamespaces) {
      return { success: false as const, error: 'listKubernetesNamespaces unavailable' };
    }
    return bridge.listKubernetesNamespaces(sessionId);
  }, []);

  const listKubernetesPods = useCallback(async (options: { sessionId: string; namespace?: string }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listKubernetesPods) {
      return { success: false as const, error: 'listKubernetesPods unavailable' };
    }
    return bridge.listKubernetesPods(options);
  }, []);

  const listKubernetesDeployments = useCallback(async (options: {
    sessionId: string;
    namespace?: string;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listKubernetesDeployments) {
      return { success: false as const, error: 'listKubernetesDeployments unavailable' };
    }
    return bridge.listKubernetesDeployments(options);
  }, []);

  const getKubernetesPodLogs = useCallback(async (options: {
    sessionId: string;
    namespace: string;
    pod: string;
    container?: string;
    tailLines?: number;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.getKubernetesPodLogs) {
      return { success: false as const, error: 'getKubernetesPodLogs unavailable' };
    }
    return bridge.getKubernetesPodLogs(options);
  }, []);

  const describeKubernetesPod = useCallback(async (options: {
    sessionId: string;
    namespace: string;
    pod: string;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.describeKubernetesPod) {
      return { success: false as const, error: 'describeKubernetesPod unavailable' };
    }
    return bridge.describeKubernetesPod(options);
  }, []);

  const getKubernetesCurrentContext = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.getKubernetesCurrentContext) {
      return { success: false as const, error: 'getKubernetesCurrentContext unavailable' };
    }
    return bridge.getKubernetesCurrentContext(sessionId);
  }, []);

  const listKubernetesContexts = useCallback(async (sessionId: string) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.listKubernetesContexts) {
      return { success: false as const, error: 'listKubernetesContexts unavailable' };
    }
    return bridge.listKubernetesContexts(sessionId);
  }, []);

  const deleteKubernetesPod = useCallback(async (options: {
    sessionId: string;
    namespace: string;
    pod: string;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.deleteKubernetesPod) {
      return { success: false as const, error: 'deleteKubernetesPod unavailable' };
    }
    return bridge.deleteKubernetesPod(options);
  }, []);

  const scaleKubernetesDeployment = useCallback(async (options: {
    sessionId: string;
    namespace?: string;
    name: string;
    replicas: number;
  }) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.scaleKubernetesDeployment) {
      return { success: false as const, error: 'scaleKubernetesDeployment unavailable' };
    }
    return bridge.scaleKubernetesDeployment(options);
  }, []);

  const openTerminalPopup = useCallback(async (
    payload: Parameters<NonNullable<MagiesTerminalBridge['openTerminalPopup']>>[0],
  ) => {
    const bridge = magiesTerminalBridge.get();
    if (!bridge?.openTerminalPopup) {
      return { success: false as const, error: 'openTerminalPopup unavailable' };
    }
    return bridge.openTerminalPopup(payload);
  }, []);

  return useMemo(() => ({
    probeSystemCapabilities,
    listSystemProcesses,
    signalSystemProcess,
    listTmuxSessions,
    createTmuxSession,
    listTmuxWindows,
    listTmuxPanes,
    listTmuxClients,
    tmuxAction,
    listDockerContainers,
    listDockerImages,
    getDockerStats,
    dockerInspect,
    dockerImageInspect,
    dockerAction,
    dockerImageAction,
    listKubernetesNamespaces,
    listKubernetesPods,
    listKubernetesDeployments,
    getKubernetesPodLogs,
    describeKubernetesPod,
    getKubernetesCurrentContext,
    listKubernetesContexts,
    deleteKubernetesPod,
    scaleKubernetesDeployment,
    openTerminalPopup,
  }), [
    probeSystemCapabilities,
    listSystemProcesses,
    signalSystemProcess,
    listTmuxSessions,
    createTmuxSession,
    listTmuxWindows,
    listTmuxPanes,
    listTmuxClients,
    tmuxAction,
    listDockerContainers,
    listDockerImages,
    getDockerStats,
    dockerInspect,
    dockerImageInspect,
    dockerAction,
    dockerImageAction,
    listKubernetesNamespaces,
    listKubernetesPods,
    listKubernetesDeployments,
    getKubernetesPodLogs,
    describeKubernetesPod,
    getKubernetesCurrentContext,
    listKubernetesContexts,
    deleteKubernetesPod,
    scaleKubernetesDeployment,
    openTerminalPopup,
  ]);
}
