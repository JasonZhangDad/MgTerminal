
declare global {
  interface MagiesTerminalBridge {
    probeSystemCapabilities?(sessionId: string): Promise<{
      success: boolean;
      pending?: boolean;
      error?: string;
      capabilities?: import("../../domain/systemManager/types").SessionCapabilities;
    }>;
    listSystemProcesses?(sessionId: string): Promise<{
      success: boolean;
      pending?: boolean;
      error?: string;
      processes?: import("../../domain/systemManager/types").SystemProcessInfo[];
    }>;
    signalSystemProcess?(options: {
      sessionId: string;
      pid: number;
      signal?: string;
      nice?: number;
    }): Promise<{ success: boolean; error?: string; code?: number }>;
    setupOsc7Tracking?(sessionId: string, command: string): Promise<{
      success: boolean;
      pending?: boolean;
      stdout?: string;
      stderr?: string;
      code?: number | null;
      error?: string;
    }>;
    listTmuxSessions?(sessionId: string): Promise<{
      success: boolean;
      error?: string;
      tmuxVersion?: string;
      sessions?: import("../../domain/systemManager/types").TmuxSessionInfo[];
    }>;
    createTmuxSession?(options: { sessionId: string; name: string; command?: string }): Promise<{
      success: boolean;
      error?: string;
      name?: string;
    }>;
    listTmuxWindows?(options: { sessionId: string; sessionName: string }): Promise<{
      success: boolean;
      error?: string;
      debug?: {
        lastOutput?: string;
        tried?: string[];
        sockets?: Array<string | null>;
      };
      windows?: import("../../domain/systemManager/types").TmuxWindowInfo[];
    }>;
    listTmuxPanes?(options: {
      sessionId: string;
      sessionName: string;
      windowIndex: number;
    }): Promise<{
      success: boolean;
      error?: string;
      debug?: {
        lastOutput?: string;
        tried?: string[];
        sockets?: Array<string | null>;
      };
      panes?: import("../../domain/systemManager/types").TmuxPaneInfo[];
    }>;
    listTmuxClients?(options: { sessionId: string; sessionName?: string }): Promise<{
      success: boolean;
      error?: string;
      clients?: import("../../domain/systemManager/types").TmuxClientInfo[];
    }>;
    tmuxAction?(options: {
      sessionId: string;
    } & import("../../domain/systemManager/types").TmuxManageAction): Promise<{ success: boolean; error?: string }>;
    listDockerContainers?(sessionId: string): Promise<{
      success: boolean;
      error?: string;
      containers?: import("../../domain/systemManager/types").DockerContainerInfo[];
    }>;
    listDockerImages?(sessionId: string): Promise<{
      success: boolean;
      error?: string;
      images?: import("../../domain/systemManager/types").DockerImageInfo[];
    }>;
    getDockerStats?(options: { sessionId: string; ids?: string[] }): Promise<{
      success: boolean;
      error?: string;
      stats?: import("../../domain/systemManager/types").DockerStatInfo[];
    }>;
    dockerInspect?(options: { sessionId: string; containerId: string }): Promise<{
      success: boolean;
      error?: string;
      inspect?: Record<string, unknown>;
    }>;
    dockerImageInspect?(options: { sessionId: string; imageId: string }): Promise<{
      success: boolean;
      error?: string;
      inspect?: Record<string, unknown>;
    }>;
    dockerAction?(options: {
      sessionId: string;
      containerId: string;
      action: import("../../domain/systemManager/types").DockerContainerAction;
      newName?: string;
    }): Promise<{ success: boolean; error?: string }>;
    dockerImageAction?(options: {
      sessionId: string;
    } & import("../../domain/systemManager/types").DockerImageManageAction): Promise<{
      success: boolean;
      error?: string;
      output?: string;
    }>;
    listDockerComposeProjects?(sessionId: string): Promise<{
      success: boolean;
      error?: string;
      projects?: import("../../domain/systemManager/types").DockerComposeProjectInfo[];
    }>;
    listDockerComposeServices?(options: {
      sessionId: string;
      projectName: string;
      configFiles: string[];
    }): Promise<{
      success: boolean;
      error?: string;
      services?: import("../../domain/systemManager/types").DockerComposeServiceInfo[];
    }>;
    dockerComposeAction?(options: {
      sessionId: string;
      projectName: string;
      configFiles: string[];
      action: import("../../domain/systemManager/types").DockerComposeProjectAction;
    }): Promise<{ success: boolean; error?: string; output?: string }>;
    listKubernetesNamespaces?(sessionId: string): Promise<{
      success: boolean;
      error?: string;
      namespaces?: import("../../domain/systemManager/types").KubernetesNamespaceInfo[];
    }>;
    listKubernetesPods?(options: {
      sessionId: string;
      namespace?: string;
    }): Promise<{
      success: boolean;
      error?: string;
      pods?: import("../../domain/systemManager/types").KubernetesPodInfo[];
    }>;
    listKubernetesDeployments?(options: {
      sessionId: string;
      namespace?: string;
    }): Promise<{
      success: boolean;
      error?: string;
      deployments?: import("../../domain/systemManager/types").KubernetesDeploymentInfo[];
    }>;
    getKubernetesPodLogs?(options: {
      sessionId: string;
      namespace: string;
      pod: string;
      container?: string;
      tailLines?: number;
    }): Promise<{ success: boolean; error?: string; logs?: string }>;
    describeKubernetesPod?(options: {
      sessionId: string;
      namespace: string;
      pod: string;
    }): Promise<{ success: boolean; error?: string; describe?: string }>;
    getKubernetesCurrentContext?(sessionId: string): Promise<{
      success: boolean;
      error?: string;
      context?: string | null;
    }>;
    listKubernetesContexts?(sessionId: string): Promise<{
      success: boolean;
      error?: string;
      contexts?: import("../../domain/systemManager/types").KubernetesContextInfo[];
    }>;
    deleteKubernetesPod?(options: {
      sessionId: string;
      namespace: string;
      pod: string;
    }): Promise<{ success: boolean; error?: string; output?: string }>;
    scaleKubernetesDeployment?(options: {
      sessionId: string;
      namespace?: string;
      name: string;
      replicas: number;
    }): Promise<{ success: boolean; error?: string; output?: string }>;
    listKubernetesEvents?(options: {
      sessionId: string;
      namespace?: string;
    }): Promise<{
      success: boolean;
      error?: string;
      events?: import("../../domain/systemManager/types").KubernetesEventInfo[];
    }>;
    getKubernetesDeploymentRolloutStatus?(options: {
      sessionId: string;
      namespace?: string;
      name: string;
    }): Promise<{ success: boolean; error?: string; output?: string }>;
    getKubernetesDeploymentRolloutHistory?(options: {
      sessionId: string;
      namespace?: string;
      name: string;
    }): Promise<{ success: boolean; error?: string; output?: string }>;
    restartKubernetesDeploymentRollout?(options: {
      sessionId: string;
      namespace?: string;
      name: string;
    }): Promise<{ success: boolean; error?: string; output?: string }>;
    execKubernetesPod?(options: {
      sessionId: string;
      namespace: string;
      pod: string;
      container?: string;
      command: string;
    }): Promise<{ success: boolean; error?: string; output?: string }>;
    openTerminalPopup?(payload: import("../../domain/systemManager/types").TerminalPopupPayload): Promise<{
      success: boolean;
      error?: string;
      popupId?: string;
    }>;
    logDiagnostic?(payload: {
      source: string;
      message: string;
      extra?: Record<string, unknown>;
    }): Promise<{ success: boolean; error?: string }>;
    onTerminalPopupConfig?(cb: (payload: import("../../domain/systemManager/types").TerminalPopupPayload) => void): () => void;
  }
}

export {};
