# 0003: Users bring their own Spotify Client ID

**Status:** accepted (2026-11-20)

## Context

Since February 2026, a Spotify development-mode app allows at most 5 users, needs a Premium
owner, and each developer gets one Client ID. Extended quota is only granted to large
organisations. A Client ID bundled with the app could therefore serve only 5 people.

## Decision

On first launch the app asks for the user's own Client ID and shows how to create one
(dashboard link, redirect URI `http://127.0.0.1:43821/callback`, add yourself under User
Management). The Client ID is stored locally. Login uses OAuth PKCE, so no client secret is
needed anywhere.

For development, the `OPEN_SPOTIFY_CLIENT_ID` environment variable pre-fills the field.

## Consequences

- Setup takes a user about five minutes, once.
- No secrets in the repository or the packaged app.
- The redirect URI is fixed, so port 43821 must be free during login.
