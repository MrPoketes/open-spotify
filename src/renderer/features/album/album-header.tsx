import { Disc3 } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import { ArtistLinks } from "../artist/artist-links"
import type { Album } from "../spotify/spotify-album"
import { formatTotalDuration } from "../track-list/format-duration"
import { formatCount } from "../../ui/format-count"

interface AlbumHeaderProps {
  readonly album: Album
  readonly totalDurationMs: number
}

export function AlbumHeader({ album, totalDurationMs }: AlbumHeaderProps) {
  const details = [
    // Release dates start with the year, whatever their precision.
    album.releaseDate.slice(0, 4),
    formatCount(album.totalTracks, "track", "tracks"),
    formatTotalDuration(totalDurationMs),
  ]

  return (
    <PageHeader
      kind="Album"
      title={album.name}
      cover={{ sources: album.images, placeholderIcon: Disc3 }}
    >
      <p className="text-sm text-muted">
        <ArtistLinks artists={album.artists} />
        {` · ${details.join(" · ")}`}
      </p>
    </PageHeader>
  )
}
