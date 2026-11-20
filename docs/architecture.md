# Architecture

Open Spotify is an Electron app with three parts that run in separate processes.

```
┌──────────────────────────── Electron ────────────────────────────┐
│                                                                  │
│  main process (Node)            renderer process (Chromium)      │
│  src/main                       src/renderer                     │
│  ├─ window + app:// protocol    ├─ TanStack Start (SPA mode)     │
│  ├─ IPC handlers                ├─ React UI                      │
│  ├─ local storage (SQLite)      ├─ Spotify Web API client        │
│  └─ OAuth login + tokens        └─ DesktopBridge ──┐             │
│        ▲                                           │             │
│        └──── ipcMain.handle ◄── preload ◄──────────┘             │
│                                 (window.desktop)                 │
└──────────────────────────────────────────────────────────────────┘
```

## Main process

Owns everything that needs Node or must stay out of reach of web content:

- the application window and the `app://` protocol that serves the built UI;
- local storage (themes, folders, settings) in SQLite through `@effect/sql-sqlite-node`, which
  uses Node's built-in `node:sqlite`, so there is no native module to compile. The database
  file is `open-spotify.sqlite` in Electron's `userData` directory, and migrations
  (`src/main/database.ts`) run when `mainRuntime` starts;
- the OAuth login flow (a short-lived loopback server on `127.0.0.1:43821`) and token storage
  encrypted with Electron's `safeStorage`.

Effect programs run through `mainRuntime` (`src/main/main-runtime.ts`), which provides every
main-process service.

The main process also keeps web content contained:

- Every page carries the Content-Security-Policy from `src/shared/content-security-policy.ts`.
  The `app://` handler gives each load a fresh nonce for TanStack Start's inline scripts. The
  dev server sends the same policy with a fixed placeholder nonce.
- The window navigates only within the app. https links open in the system browser, and
  everything else is blocked (`src/main/navigation-decision.ts`).
- Only one instance runs. A second launch quits before it touches `mainRuntime` and focuses the
  running copy's window instead.

## Preload

`src/preload/preload.ts` exposes one object, `window.desktop`, with an
`invoke(channel, request)` method. Its type lives in `src/preload/desktop-api.ts`. The preload
script contains no logic.

## Renderer

A single-page React app. TanStack Start runs in SPA mode: the build emits static files plus
`_shell.html`, and the main process serves them over `app://renderer/`. In development the
window loads the Vite dev server instead.

- Routes live in `src/renderer/routes` (file-based routing).
- Effect programs run through `rendererRuntime` (`src/renderer/lib/renderer-runtime.ts`).
- The renderer calls the Spotify Web API directly with an access token it requests from the
  main process.
- `src/renderer/client.tsx` replaces TanStack Start's default client entry. It applies the
  saved theme (`src/renderer/features/themes`) before React hydrates, and the main process
  creates the window with that theme's background color, so the wrong theme never flashes.

## IPC contract

1. Add the channel name to `src/shared/ipc-channels.ts`.
2. Define request and reply Schemas in `src/shared`.
3. Handle the channel in the main process, decoding the request with its Schema through
   `decodeIpcRequest` (`src/main/decode-ipc-request.ts`). A request that does not decode fails
   with `MalformedIpcRequest`.
4. Add a method to `DesktopBridge` that encodes the request and decodes the reply.

IPC messages are structured-cloned, so they carry only plain data: send the Schema-encoded form
(for example, a missing value as `null`, never an `Option`).

Each side decodes what it receives, so a mismatch shows up as a typed error at the boundary.

## Build

| Part             | Tool                                      | Output        |
| ---------------- | ----------------------------------------- | ------------- |
| Renderer         | Vite + TanStack Start (`vite.config.ts`)  | `dist/client` |
| Main and preload | electron-vite (`electron.vite.config.ts`) | `out/`        |
| Installers       | electron-builder (`electron-builder.yml`) | `release/`    |

`dist/server` is a by-product of prerendering the SPA shell and is not shipped.
