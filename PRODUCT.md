# Product

<!-- impeccable:product-schema 1 -->

The product record that design work reads. How the app looks is in
[docs/design.md](docs/design.md); how it is built is in [AGENTS.md](AGENTS.md).

## Platform

web

Open Spotify is an Electron desktop app (Windows, macOS, Linux) whose UI is a React web page, so
its design language is the web's, not a native toolkit's.

## Users

People who listen to Spotify for hours at a computer while they work, study, or play, and who
care how their tools look and feel. Most know what they want to hear, keep a large library, and
reach for the keyboard. The app usually sits in a corner of the screen or behind other windows,
and is glanced at to change what plays.

## Product Purpose

A desktop client for Spotify that improves on the official one. Success is a listener who
prefers it daily: it looks considered, it fits the way they arrange their music, and it never
leaves them wondering why nothing plays.

## Positioning

Two things the official client cannot claim: **themes** that restyle every color, font, radius,
and shadow (pick one, edit a copy, or import a file), and **folders that hold anything**:
playlists, artists, albums, shows, tracks, and other folders, side by side.

## Operating Context

- Playback is remote control through Spotify Connect: audio plays in an official Spotify app, on
  another device, or on "This computer" through the Web Playback SDK when Spotify allows it.
- Spotify's Web API runs in development mode: no recommendations, related artists, or audio
  features, and search returns 10 items per page.
- Every user brings their own Spotify Client ID and needs Premium.

## Capabilities and Constraints

- Library sidebar with sections, pins, filters, and folders; Home (recently played, top artists
  and tracks, jump back in); search; album, artist, playlist, show, folder, and Liked Songs pages;
  now-playing bar, queue, and device picker; settings and the theme editor.
- Everything works from the keyboard, with one shortcut registry.
- Album, artist, playlist, and show artwork comes from Spotify. There is no artwork for Liked
  Songs, folders, or local files.

## Brand Commitments

- The name is Open Spotify. It is an unofficial client and borrows nothing of Spotify's
  identity: no logo, wordmark, green, or fonts.
- The app icon is a coral ring open at the top right around a play triangle (`build/icon.svg`).
- Themes must be able to change every pixel, so no component fixes a color, font, radius, or
  shadow.

## Evidence on Hand

Fixture data for tests and screenshots: the user "Mira Kaelin", playlists such as "Late Night
Drive", and invented artists and albums (`src/renderer/features/spotify/spotify-fixtures.ts`).
There are no real users, testimonials, or metrics yet.

## Product Principles

1. The music is the content: artwork and titles lead, chrome recedes.
2. Fast for people who know what they want: every path works from the keyboard.
3. The user arranges the app, and the app remembers.
4. Never leave the listener guessing: every failure says what happened and what to do.

## Accessibility & Inclusion

WCAG 2.2 AA: contrast targets checked for every built-in theme, full keyboard use, visible focus,
reduced motion respected, state never shown by color alone.
