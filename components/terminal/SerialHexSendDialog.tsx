/**
 * Send raw bytes to a serial device.
 *
 * Typed hex never goes through the terminal's text path — bytes like 0xFF have
 * no reading in the session charset and would be rewritten by the encoder.
 */
import React, { useMemo, useState } from "react";
import { useI18n } from "../../application/i18n/I18nProvider";
import { formatHexPreview, parseHexBytes } from "../../domain/serialHexInput";
import { magiesTerminalBridge } from "@/infrastructure/services/magiesTerminalBridge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export interface SerialHexSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export const SerialHexSendDialog: React.FC<SerialHexSendDialogProps> = ({
  open,
  onOpenChange,
  sessionId,
}) => {
  const { t } = useI18n();
  const [value, setValue] = useState("");

  const parsed = useMemo(() => parseHexBytes(value), [value]);
  const showError = value.trim().length > 0 && !parsed.ok;

  const handleSend = () => {
    if (!parsed.ok) return;
    magiesTerminalBridge.get()?.writeHexToSession?.(sessionId, parsed.hex);
    setValue("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("terminal.serialHex.title")}</DialogTitle>
          <DialogDescription>{t("terminal.serialHex.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t("terminal.serialHex.input")}</Label>
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="48 65 6C 6C 6F"
            className="font-mono text-sm"
            rows={3}
            autoFocus
          />
          {showError ? (
            <p className="text-xs text-destructive">
              {t(`terminal.serialHex.error.${parsed.ok ? "" : parsed.error}`)}
            </p>
          ) : parsed.ok ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("terminal.serialHex.byteCount", { count: parsed.byteLength })}
              </p>
              <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/30 p-2 font-mono text-xs">
                {formatHexPreview(parsed.hex)}
              </pre>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={!parsed.ok}>
            {t("terminal.serialHex.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SerialHexSendDialog;
