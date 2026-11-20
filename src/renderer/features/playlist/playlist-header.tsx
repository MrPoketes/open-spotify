import { ListMusic } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import type { Playlist } from "../spotify/spotify-playlist"

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
    <PageHeader
      kind="Playlist"
      title={playlist.name}
      cover={{ sources: playlist.images ?? [], placeholderIcon: ListMusic }}
    >
      {description === "" ? null : <p className="text-sm text-muted">{description}</p>}
      <p className="text-sm text-muted">{details.join(" · ")}</p>
    </PageHeader>
  )
}
