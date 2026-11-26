const spotifyDashboardUrl = "https://developer.spotify.com/dashboard"

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
