
declare global {
  interface MagiesTerminalHostHealthProgressEvent {
    runId: string;
    hostId: string;
    status: "running" | "done";
    result?: import("../../domain/hostHealth").HostHealthResult;
  }

  interface MagiesTerminalBridge {
    runHostHealthCheck?(payload: {
      runId?: string;
      concurrency?: number;
      hosts: import("../../domain/hostHealth").HostHealthRequest[];
    }): Promise<{
      runId: string;
      results: import("../../domain/hostHealth").HostHealthResult[];
    }>;
    cancelHostHealthCheck?(runId: string): Promise<{ cancelled: boolean }>;
    onHostHealthProgress?(
      cb: (event: MagiesTerminalHostHealthProgressEvent) => void,
    ): () => void;
  }
}

export {};
