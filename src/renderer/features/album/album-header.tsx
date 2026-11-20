import { Disc3 } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { Album } from "../spotify/spotify-album"
import { formatTotalDuration } from "../track-list/format-duration"
import { formatTrackCount } from "../track-list/format-track-count"

interface AlbumHeaderProps {
  readonly album: Album
  readonly totalDurationMs: number
}

export function AlbumHeader({ album, totalDurationMs }: AlbumHeaderProps) {
  const details = [
    formatArtistNames(album.artists),
    // Release dates start with the year, whatever their precision.
    album.releaseDate.slice(0, 4),
    formatTrackCount(album.totalTracks),
    formatTotalDuration(totalDurationMs),
  ]

  return (
    <PageHeader
      kind="Album"
      title={album.name}
      cover={{ sources: album.images, placeholderIcon: Disc3 }}
    >
      <p className="text-sm text-muted">{details.join(" · ")}</p>
    </PageHeader>
  )
}
