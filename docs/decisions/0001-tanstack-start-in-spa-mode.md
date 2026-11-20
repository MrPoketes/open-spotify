# 0001: TanStack Start in SPA mode inside Electron

**Status:** accepted (2026-11-20)

## Context

The project should use TanStack Start. Start's main features (server rendering, server
functions) need a server, and an Electron app has none at runtime.

## Decision

Use TanStack Start with `spa: { enabled: true }`. The build prerenders only the root shell
(`_shell.html`); routes render on the client. The main process serves the build output over a
privileged `app://` scheme with a fallback to the shell for client-side routes.

The root route uses `shellComponent`, and the router sets `defaultPendingComponent`, so the
first client render matches the prerendered shell. Without both, React reports a hydration
mismatch.

## Consequences

- File-based routing, loaders, and type-safe links from TanStack Router.
- Server functions are not available. Anything that needs Node goes through IPC to the main
  process instead.
- The build also produces `dist/server`, which is used only for prerendering and is not
  packaged.
