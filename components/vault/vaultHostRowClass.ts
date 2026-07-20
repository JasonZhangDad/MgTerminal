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
      "soft-card elevate rounded-2xl h-[72px] px-3.5 py-2.5 will-change-transform",
      "transition-[opacity,box-shadow,border-color,background-color,transform] duration-150",
      isDragging && "opacity-45",
      isSelected && "border-primary/55 ring-2 ring-primary/35 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_12px_28px_-10px_hsl(var(--primary)/0.35)]",
      className,
    );
  }

  return cn(
    "h-14 px-3 py-2 rounded-xl transition-[background-color,box-shadow,color] duration-150 border border-transparent",
    isSelected
      ? "bg-primary/12 text-foreground border-primary/20 shadow-[inset_3px_0_0_0_hsl(var(--primary)),0_1px_0_hsl(var(--primary)/0.08)]"
      : "hover:bg-secondary/70 hover:border-border/50",
    className,
  );
}
