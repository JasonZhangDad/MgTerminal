import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ChangelogDialog.tsx', import.meta.url), 'utf8');

test('changelog dialog body scrolls with native overflow (not unscoped ScrollArea flex-1)', () => {
  // Regression: Radix ScrollArea with only min-h-0 flex-1 inside a max-height
  // flex DialogContent never establishes a scrollport, so long release notes
  // cannot be scrolled. Prefer overflow-y-auto on a flex-1 min-h-0 container.
  assert.match(source, /min-h-0 flex-1 overflow-y-auto/);
  assert.doesNotMatch(source, /from "\.\/ui\/scroll-area"/);
  assert.doesNotMatch(source, /<ScrollArea/);
});

test('changelog dialog constrains height so the body can scroll within the viewport', () => {
  assert.match(source, /max-h-\[min\(88vh,720px\)\]/);
  assert.match(source, /flex-col/);
  assert.match(source, /overflow-hidden/);
});

test('changelog dialog header uses changeCount for latest version stats', () => {
  assert.match(source, /settings\.application\.whatsNew\.changeCount/);
  assert.match(source, /settings\.application\.whatsNew\.inLatest/);
});

test('changelog dialog uses a lighter overlay so the window behind (left nav) stays legible', () => {
  // The default dialog overlay (bg-background/70 backdrop-blur-[3px]) dims the
  // Settings window so heavily the left nav is unreadable while What's New is
  // open. Override just this dialog's overlay to keep the background visible.
  assert.match(source, /overlayClassName="[^"]*bg-background\/40[^"]*"/);
});
