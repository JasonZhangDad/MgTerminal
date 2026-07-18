/**
 * Local-first team vault: create/join package (metadata only), roles, signed audit.
 */
import React, { useCallback, useMemo, useState } from "react";
import { Copy, Download, LogOut, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "../application/i18n/I18nProvider";
import {
  clearTeamVaultAudit,
  createLocalTeamVault,
  exportLocalTeamVaultPackage,
  getTeamVaultAuditExport,
  importTeamVaultPackageShare,
  leaveTeamVault,
  readTeamVaultAudit,
  readTeamVaultPolicy,
  updateLocalMemberRole,
} from "../application/state/teamVaultStore";
import { getLocalTeamVaultRole, teamVaultCan } from "../domain/teamVault";
import type { Host } from "../domain/models";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export type TeamVaultPanelProps = {
  hosts: Host[];
  /** Called after import with inventory hosts to merge into vault. */
  onImportInventory?: (hosts: Host[]) => void;
};

export const TeamVaultPanel: React.FC<TeamVaultPanelProps> = ({ hosts, onImportInventory }) => {
  const { t } = useI18n();
  const [policy, setPolicy] = useState(() => readTeamVaultPolicy());
  const [teamName, setTeamName] = useState("Ops");
  const [displayName, setDisplayName] = useState(() => {
    try {
      return localStorage.getItem("magiesTerminal_display_name_v1") || "Member";
    } catch {
      return "Member";
    }
  });
  const [shareInput, setShareInput] = useState("");
  const [auditText, setAuditText] = useState("");
  const role = useMemo(() => getLocalTeamVaultRole(policy), [policy]);

  const refresh = useCallback(() => {
    setPolicy(readTeamVaultPolicy());
  }, []);

  const handleCreate = useCallback(() => {
    const next = createLocalTeamVault({
      teamName: teamName.trim() || "Team",
      ownerDisplayName: displayName.trim() || "Owner",
    });
    setPolicy(next);
    toast.success(t("teamVault.created") || "Team created");
  }, [displayName, t, teamName]);

  const handleExport = useCallback(async () => {
    const result = exportLocalTeamVaultPackage(hosts);
    if (!result.ok) {
      toast.error(result.error === "forbidden"
        ? (t("teamVault.forbidden") || "Not allowed")
        : (t("teamVault.noTeam") || "No team yet"));
      return;
    }
    try {
      await navigator.clipboard.writeText(result.shareString);
      toast.success(t("teamVault.exported") || "Team package copied (metadata only)");
    } catch {
      toast.message(result.shareString.slice(0, 80) + "…");
    }
    refresh();
  }, [hosts, refresh, t]);

  const handleImport = useCallback(() => {
    const result = importTeamVaultPackageShare(shareInput, displayName.trim() || "Member");
    if (!result.ok) {
      toast.error(t("teamVault.importFailed") || `Import failed: ${result.error}`);
      return;
    }
    setPolicy(result.policy);
    // Inventory items are metadata-only HostInventoryItem[]; convert via host data source path
    // is left to caller when available. Surface count for now.
    toast.success(
      t("teamVault.imported")
        || `Joined team · ${result.package.inventory.hosts.length} hosts in package`,
    );
    void onImportInventory;
    setShareInput("");
  }, [displayName, onImportInventory, shareInput, t]);

  const handleLeave = useCallback(() => {
    leaveTeamVault();
    setPolicy(null);
    toast.success(t("teamVault.left") || "Left team");
  }, [t]);

  const handleShowAudit = useCallback(() => {
    setAuditText(getTeamVaultAuditExport("text") || (t("teamVault.auditEmpty") || "(empty)"));
  }, [t]);

  const handleCopyAudit = useCallback(async () => {
    const text = getTeamVaultAuditExport("ndjson");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("teamVault.auditCopied") || "Audit copied (NDJSON)");
    } catch {
      toast.error(t("teamVault.copyFailed") || "Copy failed");
    }
  }, [t]);

  const handleClearAudit = useCallback(() => {
    clearTeamVaultAudit();
    setAuditText("");
    toast.success(t("teamVault.auditCleared") || "Audit cleared");
  }, [t]);

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          {t("teamVault.title") || "Team Vault (local-first)"}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("teamVault.desc")
          || "Share host inventory metadata only — credentials never leave this device. Roles gate export/import. Audit can be HMAC-signed with the team key."}
      </p>

      {!policy ? (
        <div className="space-y-2">
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder={t("teamVault.teamName") || "Team name"}
          />
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("teamVault.displayName") || "Your display name"}
          />
          <Button size="sm" onClick={handleCreate}>
            <Shield size={14} className="mr-2" />
            {t("teamVault.create") || "Create team"}
          </Button>
          <div className="text-xs text-muted-foreground pt-2">
            {t("teamVault.orJoin") || "Or paste a team package to join as viewer:"}
          </div>
          <Textarea
            value={shareInput}
            onChange={(e) => setShareInput(e.target.value)}
            placeholder="magies-team:1:…"
            className="min-h-[72px] text-xs font-mono"
          />
          <Button size="sm" variant="secondary" onClick={handleImport}>
            <Download size={14} className="mr-2" />
            {t("teamVault.join") || "Join team"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">{policy.teamName}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {role || "?"} · {policy.members.length} {t("teamVault.members") || "members"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamVaultCan(policy, "share_package") && (
              <Button size="sm" onClick={() => void handleExport()}>
                <Copy size={14} className="mr-2" />
                {t("teamVault.export") || "Export package"}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleShowAudit}>
              {t("teamVault.showAudit") || "Show audit"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void handleCopyAudit()}>
              {t("teamVault.copyAudit") || "Copy audit"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClearAudit}>
              {t("teamVault.clearAudit") || "Clear audit"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLeave}>
              <LogOut size={14} className="mr-2" />
              {t("teamVault.leave") || "Leave"}
            </Button>
          </div>
          {teamVaultCan(policy, "manage_members") && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {t("teamVault.roster") || "Roster"}
              </div>
              {policy.members.map((m) => (
                <div key={m.memberId} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate">{m.displayName}</span>
                  <select
                    className="h-7 rounded border border-border bg-background px-1"
                    value={m.role}
                    disabled={m.memberId === policy.localMemberId}
                    onChange={(e) => {
                      const result = updateLocalMemberRole(
                        m.memberId,
                        e.target.value as "owner" | "editor" | "viewer",
                      );
                      if (result.ok) setPolicy(result.policy);
                    }}
                  >
                    <option value="owner">owner</option>
                    <option value="editor">editor</option>
                    <option value="viewer">viewer</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          {auditText && (
            <pre className="max-h-40 overflow-auto rounded bg-muted/40 p-2 text-[10px] font-mono whitespace-pre-wrap">
              {auditText}
            </pre>
          )}
          <div className="text-xs text-muted-foreground pt-1">
            {t("teamVault.joinAnother") || "Join / update from package:"}
          </div>
          <Textarea
            value={shareInput}
            onChange={(e) => setShareInput(e.target.value)}
            placeholder="magies-team:1:…"
            className="min-h-[56px] text-xs font-mono"
          />
          <Button size="sm" variant="secondary" onClick={handleImport}>
            {t("teamVault.importUpdate") || "Import package"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TeamVaultPanel;
