import { cn } from "../../lib/utils";

export type VaultHostRowViewMode = "grid" | "list" | "tree" | string;

/** Shared Vault host card / list-row chrome (multi-select + drag). */
export function getVaultHostRowClassName(options: {
  viewMode: VaultHostRowViewMode;
  isDragging?: boolean;
  isSelected?: boolean;
  className?: string;
}): string {
  const { viewMode, isDragging = false, isSelected = false, className } = options;

  if (viewMode === "grid") {
    return cn(
      "soft-card elevate rounded-xl h-[68px] px-3 py-2 will-change-transform",
      "transition-[opacity,box-shadow,border-color,background-color] duration-150",
      isDragging && "opacity-45",
      isSelected && "border-primary/45 ring-1 ring-primary/30 bg-primary/5",
      className,
    );
  }

  return cn(
    "h-14 px-3 py-2 rounded-lg transition-colors duration-150",
    isSelected
      ? "bg-primary/10 text-foreground shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
      : "hover:bg-secondary/60",
    className,
  );
}
