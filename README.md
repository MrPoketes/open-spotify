# Open Spotify

A themeable, open-source desktop client for Spotify, for Windows, macOS, and Linux.

- **Themes:** pick a theme or import your own. Every color, font, and radius is a token.
- **Folders for anything:** group playlists, artists, albums, and shows however you like.
- **A better layout:** resizable panes, keyboard-first navigation, and a denser list view.

> Status: early development. Built in the open by an autonomous team of AI agents; see
> [docs/agents](docs/agents).

## Requirements

- Spotify Premium
- An official Spotify app running somewhere (desktop, phone, or speaker). Open Spotify
  controls playback through Spotify Connect; see
  [decision 0002](docs/decisions/0002-playback-through-spotify-connect.md).
- Your own Spotify Client ID (free, about five minutes):
  1. Open the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and create
     an app.
  2. Add the redirect URI `http://127.0.0.1:43821/callback` and select **Web API**.
  3. Under **User Management**, add the email of your Spotify account.
  4. Paste the Client ID into Open Spotify on first launch.

## Development

```sh
pnpm install
pnpm dev      # app with hot reload
pnpm check    # lint, format, typecheck, tests
```

Read [AGENTS.md](AGENTS.md) for the coding rules (they apply to humans too) and
[docs/architecture.md](docs/architecture.md) for how the pieces fit.

## License

[MIT](LICENSE)
