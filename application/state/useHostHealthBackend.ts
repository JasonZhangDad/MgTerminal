import { useCallback, useEffect, useRef } from "react";
import { magiesTerminalBridge } from "../../infrastructure/services/magiesTerminalBridge";
import type { HostHealthRequest, HostHealthResult } from "../../domain/hostHealth";

// Thin backend hook for the multi-host health snapshot bridge.
export const useHostHealthBackend = () => {
  const runHealthCheck = useCallback(
    async (payload: {
      runId?: string;
      concurrency?: number;
      hosts: HostHealthRequest[];
    }): Promise<{ runId: string; results: HostHealthResult[] } | null> => {
      const bridge = magiesTerminalBridge.get();
      if (!bridge?.runHostHealthCheck) return null;
      return bridge.runHostHealthCheck(payload);
    },
    [],
  );

  const cancelHealthCheck = useCallback(async (runId: string) => {
    await magiesTerminalBridge.get()?.cancelHostHealthCheck?.(runId);
  }, []);

  const listenerRef = useRef<((event: MagiesTerminalHostHealthProgressEvent) => void) | null>(null);
  useEffect(() => {
    const unsubscribe = magiesTerminalBridge.get()?.onHostHealthProgress?.(
      (event) => listenerRef.current?.(event),
    );
    return () => unsubscribe?.();
  }, []);

  const setProgressListener = useCallback(
    (listener: ((event: MagiesTerminalHostHealthProgressEvent) => void) | null) => {
      listenerRef.current = listener;
    },
    [],
  );

  return { runHealthCheck, cancelHealthCheck, setProgressListener };
};
