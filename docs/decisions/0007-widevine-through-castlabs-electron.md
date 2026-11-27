# 0007: Widevine through castlabs Electron

**Status:** accepted (2026-11-27). Amends [0002](0002-playback-through-spotify-connect.md).

## Context

Decision 0002 made Open Spotify a remote control: audio plays in the official Spotify app or on
another device, so the computer running Open Spotify is silent unless the official app runs too.

Spotify's Web Playback SDK turns a web page into a Spotify Connect device. It decrypts audio with
Widevine through the browser's Encrypted Media Extensions (EME). Stock Electron ships no Widevine.
Spotify does not support the SDK in Electron, and developers report mixed results: some get audio,
others get a 500 error from Spotify's licence server.

Options weighed:

1. **castlabs Electron for Content Security (ECS).** A maintained fork of Electron that installs
   Google's Widevine CDM through Chromium's component updater and is VMP-signed for development.
   castlabs also offers EVS, a free service that gives a package a production VMP signature.
2. **Stock Electron with a bundled Widevine CDM.** Distributing the CDM needs an MPEG-LA licence, a
   bundled CDM goes stale and stops getting licences, and there is no VMP signature.
3. **librespot.** Rejected in 0002: it violates Spotify's terms.

## Decision

- Open Spotify runs on castlabs Electron. `electron` in `package.json` points at a castlabs release
  tag (`github:castlabs/electron-releases#v45.2.1+wvcus`), so electron-vite, `install-electron` and
  electron-builder all use it. electron-builder downloads castlabs' binaries through
  `electronDownload.mirror` in `electron-builder.yml`.
- The main process waits for `components.whenReady()` before it opens the window, because a page
  that loads before the CDM is installed cannot use it (`src/main/widevine.ts`). The wait is capped
  at 30 seconds: offline, the first launch cannot download the CDM, and remote control must still
  work. A failed or timed-out install is logged and the window opens anyway.
- The `app://` scheme is standard and secure (`src/main/renderer-protocol.ts`), which EME requires.
- Login asks for the `streaming` scope. A saved session that lacks any scope the app asks for is
  cleared and answers `SessionExpired`, so the user logs in once to grant it.
- Remote control through Spotify Connect stays as it is. "This computer" is an extra device in the
  existing device picker, added by ARM-165 to ARM-167.
- The renderer's `WebPlaybackSdk` service (`src/renderer/features/this-computer/web-playback-sdk.ts`)
  loads `https://sdk.scdn.co/spotify-player.js` and is the only code that sets
  `window.onSpotifyWebPlaybackSDKReady`. The SDK's player joins Spotify Connect as "Open Spotify",
  so other Spotify apps list it under the app's name, and Open Spotify's own picker shows it as
  "This computer". It asks the main process for a fresh access token every time the SDK wants one.
  It lives as long as the app shell, which unmounts on log out, so the next account never sees the
  previous account's player.

## Content Security Policy

The SDK script runs in the app's page and does only one thing there: it adds a hidden iframe,
`https://sdk.scdn.co/embedded/index.html`, with `allow="encrypted-media; autoplay"`, and talks to it
with `postMessage`. The iframe plays the audio. Its websocket to Spotify Connect, its Widevine
licence requests and its audio downloads come from the iframe's document, which is cross-origin and
carries its own policy, so the app's policy (`src/shared/content-security-policy.ts`) does not
govern them. The app's policy therefore adds only:

- `https://sdk.scdn.co` to `script-src`, for `spotify-player.js`;
- `frame-src https://sdk.scdn.co`, for the iframe.

## When the licence fails

Nothing else breaks. Widevine and the SDK only add a device. If Widevine does not install, the log
says so, the renderer learns it over IPC, and the "This computer" entry says "Protected playback
isn't available on this computer" without loading the SDK. If the SDK fails to start or Spotify
rejects the licence, the entry shows why (ARM-166), and every other device keeps working.

## VMP signing and releases

Widevine's Verified Media Path (VMP) lets a licence server check that the app is a known, untampered
build. On Windows and macOS, production services such as Spotify typically refuse licences without
a valid production VMP signature, which fits the 500 errors others report. Linux Widevine has no
VMP, and Spotify's web player works in desktop Linux browsers, so Linux is the platform most likely
to work without signing.

castlabs' development signature is not enough. It is only valid for Widevine's test servers, and
packaging breaks it anyway: electron-builder renames the Windows executable to `Open Spotify.exe`
and re-signs the macOS app. On a packaged Windows build, `castlabs_evs.vmp sign-pkg` reports
"Existing signature invalid".

The release workflow (`.github/workflows/release.yml`) therefore signs Windows and macOS packages
with EVS when the repository has the secrets `EVS_ACCOUNT_NAME` and `EVS_PASSWD`. It installs the
`castlabs-evs` Python client, refreshes the account's tokens, and passes
`scripts/vmp-sign-package.ts` to electron-builder as a hook. castlabs requires VMP signing before
code signing on macOS and after it on Windows, so macOS signs in `afterPack` and Windows in
`afterSign`. On Windows, `afterPack` would also be too early for another reason: electron-builder
rewrites the executable's icon and version resources after it, even without a certificate.
Without the secrets, the installers still build, without VMP signatures.

To set it up, the owner creates a free EVS account with
`python -m pip install castlabs-evs` and `python -m castlabs_evs.account signup`, then adds the
account name and password as repository secrets. To test a local build, sign it after
`pnpm package:dir` with `python -m castlabs_evs.vmp sign-pkg release/win-unpacked` (or the `mac`
folder), or sign `node_modules/electron/dist` to test `pnpm dev`.

## Consequences

- The Electron version follows castlabs' releases, which trail stock Electron by days or weeks.
  To update, change the tag in `package.json` to the newest castlabs release on the wanted major.
- The first launch downloads the Widevine CDM from Google. Offline, that launch waits up to 30
  seconds before the window opens.
- EVS only signs binaries it recognizes. If it refuses a package ("Binary signature denied"), a
  packaging step changed a binary in a way castlabs does not accept; the castlabs FAQ lists the
  known causes.
- macOS builds keep hardened runtime off. If they are ever notarized, they need the
  `com.apple.security.cs.disable-library-validation` entitlement, or the CDM cannot load.
