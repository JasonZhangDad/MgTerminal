# Native Cross-Platform Mosh Client

Status: **shipped via [MoshMagies](https://github.com/Zhangwei930/MoshMagies)**
Related: [#2025](https://github.com/JasonZhangDad/MagiesTerminal/issues/2025), [#2072](https://github.com/JasonZhangDad/MagiesTerminal/issues/2072)

## Canonical repository

**https://github.com/Zhangwei930/MoshMagies**

MagiesTerminal only **consumes** `moshmagies-*` release binaries into `resources/mosh/`
via `scripts/fetch-mosh-binaries.cjs` / `scripts/resolve-mosh-bin-release.cjs`
(default `MOSH_BIN_REPO=MoshMagies`).

There is **no** in-tree Rust source, no Cygwin packaging path, and no
FluentTerminal / `mosh-bin-*` fallback.

## Integration contract

```text
MOSH_KEY=<key> mosh-client <host> <port>
```

MagiesTerminal owns SSH bootstrap (`moshHandshake` + PTY), then swaps to the
bundled MoshMagies binary under `node-pty`.

| Concern | Owner |
|---------|--------|
| SSH auth / `MOSH CONNECT` parse | MagiesTerminal Electron |
| UDP Mosh data plane | MoshMagies binary |
| Packaging / fetch / electron-builder | MagiesTerminal scripts → MoshMagies releases |

## Why

Windows Cygwin `mosh-client` + partial runtime + ConPTY sandwich was
architecturally broken. MoshMagies is a pure Rust, wire-compatible client with
one code path on Linux / macOS / Windows (static CRT on Windows).

## Linux compatibility floors

MoshMagies Linux release binaries must target the **same glibc floors as
MagiesTerminal package jobs** (not bare `ubuntu-latest`):

| Target | MagiesTerminal package image | Max GLIBC |
|--------|------------------------|-----------|
| `linux-x64` | `almalinux:8` | 2.28 |
| `linux-arm64` | `debian:bullseye` | 2.31 |

Enforced upstream from `moshmagies-0.1.2` via MoshMagies release CI
(`scripts/assert-max-glibc.sh`). Do not pin packaging to pre-0.1.2 Linux
assets (they require GLIBC 2.34).

## Windows compatibility floor

MagiesTerminal requires `moshmagies-0.1.4+`. That release preserves arrow keys,
Ctrl/Alt-modified shortcuts, and Ctrl+C through Windows ConPTY. Packaging must
not resolve or accept an older MoshMagies release.

## Decision log

- **2026-07-10:** Feasibility accepted; client extracted to `Zhangwei930/MoshMagies`.
- **2026-07-10:** MagiesTerminal defaults packaging to MoshMagies releases.
- **2026-07-10:** Removed legacy Cygwin build pipeline, FluentTerminal fallback,
  `mosh-bin-*` tags, dll/terminfo runtime helpers. Pure MoshMagies only
  (`moshmagies-0.1.1`: ConPTY Ctrl+C + static MSVC CRT).
- **2026-07-10:** Require `moshmagies-0.1.2+` for Linux glibc floors matching
  MagiesTerminal (x64 ≤ 2.28, arm64 ≤ 2.31).
- **2026-07-11:** Require `moshmagies-0.1.4+` for Windows ConPTY shortcut input;
  keep Mosh sessions on MagiesTerminal's primary terminal screen so highlighting and
  scrollback remain available.
