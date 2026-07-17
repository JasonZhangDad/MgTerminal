/**
 * Connection Test Panel — runs the step-by-step connection diagnostics
 * (DNS → TCP → jump chain → host key → auth → SFTP) for a host configuration
 * and renders live per-step results.
 */
import {
  AlertTriangle,
  Check,
  Loader2,
  Minus,
  RotateCw,
  X as XIcon,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../application/i18n/I18nProvider";
import {
  DIAGNOSTIC_STEP_IDS,
  diagnosticStepLabelKey,
  type DiagnosticStepId,
  type DiagnosticStepResult,
} from "../../domain/connectionDiagnostics";
import { useConnectionDiagnosticsBackend } from "../../application/state/useConnectionDiagnosticsBackend";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export interface ConnectionTestPanelProps {
  open: boolean;
  onClose: () => void;
  hostLabel: string;
  /** Built lazily per run so the latest (unsaved) form values are probed. */
  buildRequest: () => (MagiesTerminalSSHOptions & { runId?: string }) | null;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  running: <Loader2 size={14} className="animate-spin text-muted-foreground" />,
  success: <Check size={14} className="text-emerald-500" />,
  warning: <AlertTriangle size={14} className="text-amber-500" />,
  failed: <XIcon size={14} className="text-red-500" />,
  skipped: <Minus size={14} className="text-muted-foreground/60" />,
  pending: <Minus size={14} className="text-muted-foreground/30" />,
};

export const ConnectionTestPanel: React.FC<ConnectionTestPanelProps> = ({
  open,
  onClose,
  hostLabel,
  buildRequest,
}) => {
  const { t } = useI18n();
  const { runDiagnostics, cancelDiagnostics, setProgressListener } =
    useConnectionDiagnosticsBackend();
  const [results, setResults] = useState<Map<DiagnosticStepId, DiagnosticStepResult>>(
    () => new Map(),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [bridgeMissing, setBridgeMissing] = useState(false);
  const [plannedSteps, setPlannedSteps] = useState<DiagnosticStepId[]>([...DIAGNOSTIC_STEP_IDS]);
  const runIdRef = useRef<string | null>(null);
  const hadProgressRef = useRef(false);

  const describeResult = useCallback(
    (result: DiagnosticStepResult | undefined): string => {
      if (!result) return t("diagnostics.status.pending");
      if (result.step === "hostKey" && result.hostKeyStatus) {
        const suffix = result.detail ? ` · ${result.detail}` : "";
        const keyStatus = result.hostKeyStatus === "trusted-system"
          ? "trustedSystem"
          : result.hostKeyStatus;
        return `${t(`diagnostics.hostKey.${keyStatus}`)}${suffix}`;
      }
      if (result.detailKind === "proxyCommand") return t("diagnostics.detail.proxyCommand");
      if (result.detailKind === "needsInteractive") return t("diagnostics.detail.needsInteractive");
      if (result.status === "skipped") return t("diagnostics.status.skipped");
      if (result.status === "running") {
        return result.detail
          ? `${t("diagnostics.status.running")} · ${result.detail}`
          : t("diagnostics.status.running");
      }
      const statusLabel = t(`diagnostics.status.${result.status}`);
      return result.detail ? `${statusLabel} · ${result.detail}` : statusLabel;
    },
    [t],
  );

  const startRun = useCallback(async () => {
    const request = buildRequest();
    if (!request) {
      setBridgeMissing(true);
      return;
    }
    const runId = `diag-${crypto.randomUUID()}`;
    runIdRef.current = runId;
    const steps = DIAGNOSTIC_STEP_IDS.filter(
      (step) => step !== "jumpChain" || (request.jumpHosts?.length ?? 0) > 0,
    );
    setPlannedSteps(steps);
    setResults(new Map());
    setBridgeMissing(false);
    setIsRunning(true);
    hadProgressRef.current = false;
    try {
      const response = await runDiagnostics({ ...request, runId });
      if (runIdRef.current !== runId) return;
      if (!response) {
        setBridgeMissing(true);
        return;
      }
      setResults(new Map(response.results.map((result) => [result.step, result])));
    } catch {
      // Progress events already reported per-step failures; a rejected invoke
      // without any progress means the bridge itself is unavailable.
      if (runIdRef.current === runId && !hadProgressRef.current) {
        setBridgeMissing(true);
      }
    } finally {
      if (runIdRef.current === runId) setIsRunning(false);
    }
  }, [buildRequest, runDiagnostics]);

  useEffect(() => {
    if (!open) return;
    setProgressListener((event) => {
      if (event.runId !== runIdRef.current) return;
      hadProgressRef.current = true;
      setResults((prev) => {
        const next = new Map(prev);
        next.set(event.step, event);
        return next;
      });
    });
    void startRun();
    return () => {
      setProgressListener(null);
      const runId = runIdRef.current;
      runIdRef.current = null;
      if (runId) void cancelDiagnostics(runId);
    };
    // Restart only when the dialog is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rows = useMemo(
    () =>
      plannedSteps.map((step) => {
        const result = results.get(step);
        const status = result?.status ?? "pending";
        return { step, status, text: describeResult(result) };
      }),
    [plannedSteps, results, describeResult],
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("diagnostics.title")}</DialogTitle>
          <DialogDescription>{hostLabel}</DialogDescription>
        </DialogHeader>
        {bridgeMissing ? (
          <p className="text-sm text-muted-foreground">{t("diagnostics.unavailable")}</p>
        ) : (
          <ul className="space-y-1.5" data-testid="diagnostics-steps">
            {rows.map(({ step, status, text }) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-2"
              >
                <span className="mt-0.5 shrink-0">{STATUS_ICONS[status]}</span>
                <span className="w-28 shrink-0 text-sm font-medium">
                  {t(diagnosticStepLabelKey(step))}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 break-words text-sm",
                    status === "failed"
                      ? "text-red-500"
                      : status === "warning"
                        ? "text-amber-500"
                        : "text-muted-foreground",
                  )}
                >
                  {text}
                </span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={isRunning}
            onClick={() => void startRun()}
          >
            <RotateCw size={14} className={cn(isRunning && "animate-spin")} />
            {t("diagnostics.rerun")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionTestPanel;
