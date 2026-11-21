import { ListMusic } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import { useAddToFolder } from "../folders/use-add-to-folder"
import { ContextPlayButton } from "../playback/context-play-button"
import type { Playlist } from "../spotify/spotify-playlist"
import { formatCount } from "../../ui/format-count"

// Spotify sends descriptions HTML-escaped and sometimes with links in them.
// A parsed document is inert, so reading its text runs nothing.
const plainText = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body.textContent

interface PlaylistHeaderProps {
  readonly playlist: Playlist
  // Null when the tracks are unknown, so their total is too.
  readonly totalDuration: string | null
}

export function PlaylistHeader({ playlist, totalDuration }: PlaylistHeaderProps) {
  const addToFolder = useAddToFolder()
  const description = plainText(playlist.description ?? "")
  const details = [
    playlist.owner.displayName ?? playlist.owner.id,
    playlist.items === undefined ? null : formatCount(playlist.items.total, "track", "tracks"),
    totalDuration,
  ].filter((detail) => detail !== null)
  // A playlist whose tracks Spotify withholds still plays; an empty one has
  // nothing to play.
  const isEmpty = playlist.items?.total === 0
  const images = playlist.images ?? []

  return (
    <PageHeader
      kind="Playlist"
      title={playlist.name}
      cover={{ sources: images, placeholderIcon: ListMusic }}
      menuItems={[addToFolder({ ...playlist, images })]}
      playButton={
        isEmpty ? undefined : (
          <ContextPlayButton contextUri={playlist.uri} contextName={playlist.name} />
        )
      }
    >
      {description === "" ? null : <p className="text-sm text-muted">{description}</p>}
      <p className="text-sm text-muted">{details.join(" · ")}</p>
    </PageHeader>
  )
}
