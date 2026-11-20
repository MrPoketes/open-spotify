import { ListMusic } from "lucide-react"
import { Artwork } from "../../ui/artwork"
import type { Playlist } from "../spotify/spotify-playlist"

const coverSize = 192

const trackCountFormat = new Intl.NumberFormat()

// Spotify sends descriptions HTML-escaped and sometimes with links in them.
// A parsed document is inert, so reading its text runs nothing.
const plainText = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body.textContent

const trackCountText = (trackCount: number) =>
  `${trackCountFormat.format(trackCount)} ${trackCount === 1 ? "track" : "tracks"}`

interface PlaylistHeaderProps {
  readonly playlist: Playlist
  // Null when the tracks are unknown, so their total is too.
  readonly totalDuration: string | null
}

export function PlaylistHeader({ playlist, totalDuration }: PlaylistHeaderProps) {
  const description = plainText(playlist.description ?? "")
  const details = [
    playlist.owner.displayName ?? playlist.owner.id,
    playlist.items === undefined ? null : trackCountText(playlist.items.total),
    totalDuration,
  ].filter((detail) => detail !== null)

  return (
    <header className="flex items-end gap-6">
      <Artwork
        sources={playlist.images ?? []}
        size={coverSize}
        className="rounded-medium shadow-raised"
        placeholderIcon={ListMusic}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold text-muted">Playlist</p>
        <h1 className="font-display text-5xl font-bold break-words">{playlist.name}</h1>
        {description === "" ? null : <p className="text-sm text-muted">{description}</p>}
        <p className="text-sm text-muted">{details.join(" · ")}</p>
      </div>
    </header>
  )
}
