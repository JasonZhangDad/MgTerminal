
declare global {
  interface MagiesTerminalDiagnosticsProgressEvent {
    runId: string;
    step: import("../../domain/connectionDiagnostics").DiagnosticStepId;
    status: import("../../domain/connectionDiagnostics").DiagnosticStepStatus;
    detail?: string;
    detailKind?: string;
    errorKind?: string;
    latencyMs?: number;
    hostKeyStatus?: "trusted" | "trusted-system" | "unknown" | "changed";
    authMethod?: string;
    methodsTried?: string[];
    durationMs?: number;
  }

  interface MagiesTerminalBridge {
    runConnectionDiagnostics?(
      options: MagiesTerminalSSHOptions & { runId?: string },
    ): Promise<{
      runId: string;
      results: import("../../domain/connectionDiagnostics").DiagnosticStepResult[];
    }>;
    cancelConnectionDiagnostics?(runId: string): Promise<{ cancelled: boolean }>;
    onConnectionDiagnosticsProgress?(
      cb: (event: MagiesTerminalDiagnosticsProgressEvent) => void,
    ): () => void;
  }
}

export {};
