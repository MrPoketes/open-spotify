import { PageHeader } from "../../ui/page-header"
import { ArtistLinks } from "../artist/artist-links"
import { useAddToFolder } from "../folders/use-add-to-folder"
import { ContextPlayButton } from "../playback/context-play-button"
import type { Album } from "../spotify/spotify-album"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import { formatTotalDuration } from "../track-list/format-duration"
import { formatCount } from "../../ui/format-count"

interface AlbumHeaderProps {
  readonly album: Album
  readonly totalDurationMs: number
}

export function AlbumHeader({ album, totalDurationMs }: AlbumHeaderProps) {
  const addToFolder = useAddToFolder()
  const details = [
    // Release dates start with the year, whatever their precision.
    album.releaseDate.slice(0, 4),
    formatCount(album.totalTracks, "track", "tracks"),
    formatTotalDuration(totalDurationMs),
  ]

  return (
    <PageHeader
      kind={spotifyItemKinds.album.label}
      title={album.name}
      cover={{ sources: album.images, placeholderIcon: spotifyItemKinds.album.icon }}
      menuItems={[addToFolder(album)]}
      playButton={<ContextPlayButton contextUri={album.uri} contextName={album.name} />}
    >
      <p className="text-sm text-muted">
        <ArtistLinks artists={album.artists} />
        {` · ${details.join(" · ")}`}
      </p>
    </PageHeader>
  )
}
