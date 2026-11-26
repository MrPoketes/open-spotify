# Open Spotify: guide for agents

Open Spotify is a desktop client for Spotify (Windows, macOS, Linux) that improves on the
official UI. Its two headline features are **themes** (pick one or import your own) and
**folders** that can group anything: playlists, artists, albums, shows.

Read this file completely before changing anything. Then read
[docs/architecture.md](docs/architecture.md) and any decision record in
[docs/decisions](docs/decisions) that touches your task. If you are running as part of the
autonomous pipeline, your playbook is in [docs/agents](docs/agents).

## Commands

| Command            | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `pnpm install`     | Install dependencies (Node 24+, pnpm 11)                       |
| `pnpm dev`         | Run the app with hot reload (Vite dev server + Electron)       |
| `pnpm check`       | Lint, format check, typecheck, and test. Must pass before a PR |
| `pnpm build`       | Build renderer, main, and preload                              |
| `pnpm package:dir` | Build an unpacked app for the current OS in `release/`         |
| `pnpm test:e2e`    | Launch the unpacked app against fake Spotify                   |
| `pnpm screenshots` | Retake the README screenshots from the unpacked app            |
| `pnpm lint:fix`    | Apply automatic lint fixes                                     |
| `pnpm format`      | Format all files with Prettier                                 |
| `pnpm icons`       | Regenerate the app icon files from `build/icon.svg`            |

## Where code goes

```
src/main/       Electron main process (Node). Windows, IPC handlers, storage, auth.
src/preload/    The bridge script. Exposes `window.desktop` and nothing else.
src/shared/     Code both sides import: IPC channel names and Schemas. No Node or DOM APIs.
src/renderer/   The React UI, built by TanStack Start in SPA mode.
  routes/       Route files only. Keep them thin: load data, compose feature components.
  features/     One folder per feature (library, playback, themes, folders, ...).
  ui/           Generic, reusable components with no Spotify knowledge.
  lib/          Renderer-wide infrastructure (runtime, bridge).
e2e/            Playwright tests that launch the packaged Electron app, and the README
                screenshot script.
lint/           Project-specific oxlint rules and the unused-export check.
scripts/        Developer scripts run by hand, such as icon generation.
build/          Packaging resources: the app icon source and its generated files.
docs/           Architecture, decisions, agent playbooks.
```

The renderer is sandboxed. It never imports `electron`, `node:*`, or anything from
`src/main`. It talks to the main process only through `DesktopBridge`
(`src/renderer/lib/desktop-bridge.ts`), using channel names from `src/shared/ipc-channels.ts`.
Lint enforces this.

## The no-slop rules

The owner must be able to read any file and understand it without help. Code that is
technically correct but hard to read gets rejected. These rules are not suggestions.

1. **Names carry the meaning.** Name things after what they are or do: `playlistFolders`,
   `refreshAccessToken`. Never `data`, `info`, `item`, `result`, `handle`, `manager`, `util`,
   or abbreviations like `pl`, `cfg`, `btn`. Do not use a Spotify domain noun (`track`, `album`,
   `artist`, `playlist`, `show`, `episode`, `device`, `queue`) as the name of an unrelated
   function, variable, or helper (for example, `pendingChanges.track(...)` to mean "keep track
   of").
2. **One module, one concept.** Name files in kebab-case after that concept
   (`format-duration.ts`). No `utils.ts`, `helpers.ts`, `types.ts`, or `constants.ts`. Put a
   type next to the code that owns it. No barrel `index.ts` files.
3. **Comments explain why, never what.** Write a comment only when the reason for the code is
   not obvious: a platform quirk, a Spotify API limitation, a security concern. Never write
   comments that restate the code, section banners, commented-out code, JSDoc that repeats the
   signature, or `TODO`s (open a Linear issue instead).

   ```ts
   // Bad: restates the code
   // Get the user's playlists
   const playlists = yield * spotify.getPlaylists

   // Good: explains a constraint the code cannot show
   // Spotify caps search results at 10 per page for development-mode apps.
   const searchPageSize = 10
   ```

4. **No speculative code.** Build what the task needs, nothing more. No options nobody passes,
   no parameters "for later", no abstraction with one implementation, no wrapper that only
   forwards its arguments. Abstract on the third repetition, not the first: the PR that would
   create the third copy extracts the shared abstraction and updates the existing copies instead
   of handing the abstraction to a follow-up issue.
5. **Validate at the edges, trust types inside.** Decode everything that enters the program
   (IPC messages, Spotify responses, files, user input) with an Effect `Schema`. After that,
   do not re-check what the types already guarantee. No defensive `?.` on values that cannot
   be undefined.
6. **Flat control flow.** Return early. No nested ternaries. No deeply nested callbacks.
7. **Delete what you replace.** No compatibility shims, no unused exports, no dead branches.
   The app has no users yet, so there is nothing to stay compatible with. A test
   (`lint/unused-exports.test.ts`) fails on any export that no other module imports. An error
   class that callers only catch by its tag stays private to its module.
8. **Small units.** Lint caps functions at 80 lines, files at 300, nesting depth at 3, and
   parameters at 3. If you hit a limit, split the code by concept; do not disable the rule.
9. **Reuse before you write.** Before writing a helper, hook, component, test fake, or long
   class string, search the codebase for one that does the job (`grep` for the logic, not
   just the name you would give it) and use or extend it. Copies drift apart: one count
   formatter gained thousands separators while its copy did not. A test
   (`lint/duplicate-code.test.ts`) fails on copied code blocks and long Tailwind class strings
   across files in `src/` and `lint/`.

A lint rule may be disabled only with a written reason
(`// oxlint-disable-next-line rule-name -- reason`), and the reviewer will check the reason. Turning
a rule off in `oxlint.config.ts` overrides counts as disabling it: the override needs a written
reason in a comment, and it is not allowed when a rename or a small refactor removes the need.

## Effect

All asynchronous or fallible logic is written with [Effect](https://effect.website) v4.
v4 differs from older versions you may remember. **Do not guess APIs.** Read
`node_modules/effect/AGENTS.md` and the examples in `node_modules/effect/ai-docs/src/` before
writing Effect code, and grep `node_modules/effect/dist/*.d.ts` when unsure.

- Define services with `Context.Service` and give them a static `layer`. See
  `DesktopBridge` for the house style.
- Define errors with `Schema.TaggedError`. Never `throw` errors, never use `try`/`catch` (lint
  enforces both). Use `Effect.try` / `Effect.tryPromise` at the boundary with a tagged error. The
  only exception is TanStack Router route control flow (`throw redirect(...)` and
  `throw notFound(...)` imported from `@tanstack/react-router`), which the router requires (see
  `src/renderer/features/login/require-login.ts`); errors are never thrown.
- Use `Effect.fn("name")` for reusable effectful functions and `Effect.gen` inline.
- Access a service with `const x = yield* Service` inside `Effect.gen`. Do not use
  `Service.use(...)`: the React hooks lint rule mistakes it for a hook.
- Run effects only at the edges: `rendererRuntime` in route loaders and `src/renderer/client.tsx`
  (lint forbids importing it elsewhere), the runtime from `RendererRuntimeContext` in components
  and hooks (so component tests can swap it), and `mainRuntime` in Electron callbacks. Provide
  every layer in those two runtime files.
- `rendererRuntime` is created once and outlives a login: logging out navigates to `/login` and
  logging in returns to `/` without reloading the renderer. A service in `rendererRuntime` that
  keeps a user's Spotify data must drop it on log out so it is never served to the next account:
  clear or invalidate its state from the log-out flow
  (`src/renderer/features/login/log-out-button.tsx`), or keep per-session caches in `AppShell`
  (see `src/renderer/features/library/library-playlists-provider.tsx`), which unmounts on log
  out and mounts fresh after login.
- Every effect forked with `runFork` must handle its typed errors (log, show to the user, or
  recover) before `runFork`. A forked fiber has no caller to receive its failure, so an unhandled
  typed error disappears. Both runtimes' `runFork` types reject effects whose error type is not
  `never`.
- Import Node platform modules by subpath, e.g. `@effect/platform-node/NodeFileSystem`. The
  package root also loads optional modules (Redis) that break the packaged app.

## Database

SQLite tables are defined once in `src/main/database-schema.ts` with Drizzle ORM, and main-process
queries run through the `Database` service in `src/main/database.ts` (`database.run((drizzle) => ...)`
and `database.withTransaction(...)`). Decode stored values at the edge with Effect `Schema`. Do
not write raw SQL (`open-spotify/no-raw-sql` forbids `` sql`...` ``, `sql.unsafe`, `sql.literal`,
and `sql.raw`).

To change the schema, update `src/main/database-schema.ts` and add a new numbered `SqliteMigrator`
step in `src/main/database.ts` (never edit shipped migrations `0001`–`0003`). Because Drizzle's
query builder cannot express SQLite DDL (`CREATE TABLE` / `ALTER TABLE`) and its file-based
migrator requires shipping `.sql` files outside the bundle, DDL statements in `src/main/database.ts`
carry an `oxlint-disable-next-line open-spotify/no-raw-sql -- <reason>` comment; any data
migration inside a step uses Drizzle. See
[decision 0005](docs/decisions/0005-drizzle-orm-for-sqlite-queries.md).

## React and styling

- Function components with named exports. Props are `readonly`. Keep components small and
  move logic into Effect services or custom hooks.
- Follow [docs/design.md](docs/design.md) for layout, spacing, type, motion, and accessibility.
- Style with Tailwind classes that use **theme tokens** (CSS custom properties). Never hard-code
  a color, font, or radius: a theme must be able to change every pixel.
- Use semantic elements (`button`, `a`, `nav`, `ul`). Everything is reachable and usable from
  the keyboard and has an accessible name.

## Tests

Every test must protect a behaviour that a user or another module depends on. A test that
cannot fail for a meaningful reason should not exist.

- **Name the behaviour.** The test name says what the code does, in the present tense:
  `"serves the app shell for client-side routes"`. Lint rejects names like `"works"` or
  `"should render"`. If the reason the behaviour matters is not obvious, add a one-line
  comment above the test explaining it.
- **Test through public interfaces.** Call the exported function, service, or component the
  way real callers do. Do not test private helpers or assert on internal calls.
- **Fake dependencies with layers, not mocks.** Give the code under test a fake layer (for
  example a fake Spotify API returning fixed data). Never call the real network.
- **Do not write:** tests for constants or trivial getters, tests that repeat what the type
  checker already proves, snapshot tests, tests that only check a function was called, or
  a test whose every failure another test would also catch (such as "returns a value after it
  is set" next to "replaces the value when set again"). Before adding a test, name a bug that
  only it would catch.
- **Do write:** a failing test before fixing a bug, tests for error paths a user can hit
  (bad data, empty states, an expired session), and tests at decoding boundaries.
- Components are tested with Testing Library: query by role or label, interact with
  `user-event`.
- **Wait for the loaded state before pressing a control.** Before pressing a control that also
  renders while loading (for example as `aria-disabled` with no click handler), wait for
  something that only the loaded state shows (for example the playing track's name). A
  `findBy*` query on the control itself resolves while data is still loading, making the test
  depend on timing.
- **Wait for values that effects write outside the DOM.** When a component test checks state a
  React effect writes outside the DOM (such as a fake service's state or `navigator.mediaSession`),
  assert it inside `waitFor` instead of right after a `findBy*` query: `findBy*` resolves as soon
  as the DOM commits, before passive `useEffect`s have necessarily run.
- **Give the fake Spotify API only the library entries the test reads.** A component test that
  renders `<Library />` (directly or through `<Sidebar />` or `<AppShell />`) passes
  `spotifyApiFakeWith(...)` with `Stream.empty` (or only the entries it reads) for the library
  streams (`currentUserPlaylists`, `savedAlbums`, `followedArtists`, `savedShows`) it does not
  use (see `src/renderer/features/folders/add-to-folder.test.tsx`). The default fake carries
  dozens of fixture entries (over fifty followed artists alone); rendering rows a test never reads
  on mount and again after every change makes tests time out when several suites run in parallel.
  Reserve the full default library for tests of the library itself, such as paging and section
  layout (see `src/renderer/features/library/library.test.tsx`).
- Effect code is tested with `@effect/vitest` (`it.effect`, `layer(...)`). See
  `src/main/renderer-files.test.ts`.
- `e2e/app.test.ts` is a smoke test of the packaged app (run `pnpm package:dir` first): it
  starts, logs in, and navigates. Keep it to that; behaviour belongs in unit and component
  tests. Its Spotify fakes are in `e2e/fake-spotify.ts`.

## Spotify constraints

- The Web API runs in development mode: at most 5 users per Client ID, the owner needs
  Premium, several endpoints are unavailable (recommendations, related artists, audio
  features, featured playlists, and others), and search returns at most 10 items per page.
  Check the current [Web API docs](https://developer.spotify.com/documentation/web-api)
  before relying on an endpoint.
- **Playback is remote control through Spotify Connect.** Audio plays in the official Spotify
  app or on another device. Do not use the Web Playback SDK or librespot. See
  [decision 0002](docs/decisions/0002-playback-through-spotify-connect.md).
- **Users bring their own Client ID**, entered on first launch. See
  [decision 0003](docs/decisions/0003-bring-your-own-client-id.md).
- Auth is OAuth PKCE with the loopback redirect `http://127.0.0.1:43821/callback`.
- **Auth failures go to login, never Retry.** Render every failed Spotify load through
  `SpotifyLoadFailure` (`src/renderer/features/spotify/spotify-load-failure.tsx`), or navigate
  with `loginDestinationFor` (`src/renderer/features/login/login-destination.ts`) when handling a
  failed load outside an error view (such as a menu action). Both send `NotLoggedIn` and
  `SessionExpired` to `/login` and retry only failures a retry can fix (network, 5xx, decode,
  temporary token-refresh failure).
- Agents cannot log in to Spotify. Every feature must be buildable and testable against fake
  data.

## Dependencies

The main and preload bundles include their dependencies, so the packaged app ships no
`node_modules`. Install every package as a dev dependency (`pnpm add -D name@exact-version`)
and pin the exact version. Explain in the PR why a new dependency is worth adding.

## When you find slop

Fix it. If it is a pattern that could come back, prevent it permanently: add a lint rule
(built-in in `oxlint.config.ts`, or custom in `lint/`), or tighten a rule in this file. Log
what you found and what you changed in [docs/agents/slop-log.md](docs/agents/slop-log.md).
