import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getVaultHostRowClassName } from "./vaultHostRowClass";

describe("getVaultHostRowClassName", () => {
  it("marks selected grid cards with primary chrome", () => {
    const className = getVaultHostRowClassName({ viewMode: "grid", isSelected: true });
    assert.match(className, /soft-card/);
    assert.match(className, /border-primary/);
    assert.match(className, /ring-primary/);
  });

  it("marks selected list rows with primary wash and leading edge", () => {
    const className = getVaultHostRowClassName({ viewMode: "list", isSelected: true });
    assert.match(className, /bg-primary\/12/);
    assert.match(className, /inset_3px_0_0_0_hsl/);
    assert.doesNotMatch(className, /hover:bg-secondary/);
  });

  it("keeps unselected list rows hoverable and dimmed while dragging in grid", () => {
    assert.match(
      getVaultHostRowClassName({ viewMode: "list", isSelected: false }),
      /hover:bg-secondary/,
    );
    assert.match(
      getVaultHostRowClassName({ viewMode: "grid", isDragging: true }),
      /opacity-45/,
    );
  });
});
