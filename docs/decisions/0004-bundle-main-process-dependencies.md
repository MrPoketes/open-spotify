# 0004: Bundle main-process dependencies

**Status:** accepted (2026-11-20)

## Context

By default electron-vite leaves `dependencies` external and electron-builder copies them into
the package. That shipped 54 MB of `node_modules`, and importing `@effect/platform-node` from
its package root crashed the packaged app because it loads an optional Redis module.

## Decision

Bundle all dependencies into `out/main/main.js` and `out/preload/preload.cjs`
(`externalizeDeps: false`). Every package is a dev dependency. Import platform modules by
subpath.

## Consequences

- The app archive is under 1 MB plus Electron itself.
- No native modules. Storage uses `node:sqlite`, which ships with Electron.
