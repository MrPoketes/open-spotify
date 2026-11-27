# 0002: Playback through Spotify Connect

**Status:** accepted (2026-11-20). Amended by
[0007](0007-widevine-through-castlabs-electron.md): the Web Playback SDK adds this computer as an
extra device.

## Context

There are three ways to play audio from a third-party Spotify client:

1. **Spotify Connect remote control.** Use the Web API's player endpoints to control playback
   on a device running an official Spotify client (desktop app, phone, speaker).
2. **Web Playback SDK.** Spotify's browser player. It is supported only in regular browsers;
   Spotify staff have said Electron is unsupported, and it depends on a Widevine licence that
   unofficial Electron builds fail to obtain.
3. **librespot.** An unofficial reimplementation of the Spotify protocol. It violates
   Spotify's terms, which is unacceptable for an open-source project.

## Decision

Open Spotify is a full UI that controls playback through Spotify Connect. Audio plays on the
device the user picks.

## Consequences

- Playback needs Spotify Premium and an official Spotify client running somewhere.
- The app must handle "no active device" clearly and offer a device picker.
- Now-playing state comes from polling the player endpoint, so it can lag by a moment.
- If Spotify ever supports an embeddable player for desktop apps, revisit this decision.
