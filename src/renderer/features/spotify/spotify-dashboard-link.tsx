import { spotifyDashboardUrl } from "./spotify-error-detail"

export function SpotifyDashboardLink() {
  return (
    <a
      href={spotifyDashboardUrl}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline"
    >
      Spotify Developer Dashboard
    </a>
  )
}
