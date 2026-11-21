import { Heart } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import { formatCount } from "../../ui/format-count"

// Spotify has no cover for Liked Songs, so it always shows the heart tile.
const likedSongsCover = {
  sources: [],
  placeholderIcon: Heart,
  placeholderColors: "bg-accent text-on-accent",
}

interface LikedSongsHeaderProps {
  readonly songCount: number
  // Null when there are no songs to add up.
  readonly totalDuration: string | null
}

export function LikedSongsHeader({ songCount, totalDuration }: LikedSongsHeaderProps) {
  const details = [formatCount(songCount, "song", "songs"), totalDuration].filter(
    (detail) => detail !== null,
  )
  return (
    <PageHeader kind="Playlist" title="Liked Songs" cover={likedSongsCover}>
      <p className="text-sm text-muted">{details.join(" · ")}</p>
    </PageHeader>
  )
}
