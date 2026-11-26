# Roadmap

The orchestrator turns these items into Linear issues, milestone by milestone. Linear milestones
match the headings below; Linear, not this file, records what has been ticketed.

## M1: Foundation (done)

- Electron + TanStack Start (SPA) + Effect scaffold, typed IPC bridge, `app://` protocol
- oxlint with custom no-slop rules, Prettier, Vitest, CI on three platforms
- Agent playbooks and the autonomous pipeline

## M2: Core plumbing

- **Design direction.** Write `docs/design.md`: the visual language and the concrete ways
  Open Spotify improves on the official client (resizable panes, denser optional list layout,
  keyboard-first navigation, command palette, customisable sidebar). Define the design tokens
  that themes will set. Every UI issue follows this document.
- **Theme engine.** A theme is a validated JSON document of design tokens applied as CSS custom
  properties. Ship a default dark and a light theme. Tailwind reads the tokens.
- **Local storage.** SQLite in the main process via `@effect/sql-sqlite-node`, with migrations
  and a typed IPC surface for reading and writing settings.
- **Hardening.** Content security policy for `app://`, block navigation away from the app,
  single-instance lock.
- **Spotify login.** First-launch screen asking for a Client ID with setup instructions
  (decision 0003), OAuth PKCE through a loopback server on port 43821, tokens encrypted with
  `safeStorage`, automatic refresh, logout.
- **Spotify Web API client.** An Effect service over `HttpClient` with Schema-decoded responses,
  pagination, retry with `Retry-After` on 429, and typed errors. Includes a fake layer with
  fixture data for tests.
- **App shell.** Layout with sidebar, main view, top bar (back, forward, search), and a
  now-playing bar. Panes are resizable and their sizes are remembered.

## M3: Library and browsing

- Library in the sidebar: playlists, liked songs, saved albums, followed artists, saved shows
- Playlist page, album page, artist page (discography), show page
- Liked songs page with fast scrolling through thousands of tracks (virtualised list)
- Search across tracks, artists, albums, playlists (10 results per page, load more)
- Home page: recently played, top artists and tracks, jump back in
- Track context menu: add to playlist, add to queue, go to artist or album, copy link

## M4: Playback through Spotify Connect

- Device picker and a clear "no active device" state (decision 0002)
- Now-playing bar: play, pause, next, previous, seek, volume, shuffle, repeat, with state polled
  from the player endpoint
- Play any track in its context (album, playlist, artist)
- Queue view
- Keyboard shortcuts and OS media keys

## M5: Folders for anything

- Data model: a folder tree whose entries can be playlists, artists, albums, shows, or tracks,
  and other folders. Stored locally.
- Sidebar folders: create, rename, delete, nest, reorder by drag and drop, collapse
- "Add to folder" from every context menu
- Folder page showing its contents as a grid or list, playable as a queue where it makes sense
- Export and import folders as a file

## M6: Theming for users

- Theme picker with live preview
- Import a theme from a file, export the current theme
- Theme editor for every token with live preview
- `docs/themes.md`: how to write and share a theme, with the full token reference

## M7: Release

- App icon and branding
- Release workflow: on a version tag, build installers for Windows, macOS, and Linux and attach
  them to a GitHub release
- Electron end-to-end smoke test with Playwright (launch, onboarding screen, navigation)
- README with screenshots, `CONTRIBUTING.md`, issue templates
