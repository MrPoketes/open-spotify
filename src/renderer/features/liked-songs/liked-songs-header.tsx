import { Heart } from "lucide-react"
import { Artwork } from "../../ui/artwork"
import { songCountText } from "./song-count-text"

const coverSize = 192

interface LikedSongsHeaderProps {
  readonly songCount: number
  // Null when there are no songs to add up.
  readonly totalDuration: string | null
}

// Spotify has no cover for Liked Songs, so it always shows the heart tile.
export function LikedSongsHeader({ songCount, totalDuration }: LikedSongsHeaderProps) {
  const details = [songCountText(songCount), totalDuration].filter((detail) => detail !== null)
  return (
    <header className="flex items-end gap-6">
      <Artwork
        sources={[]}
        size={coverSize}
        className="rounded-medium shadow-raised"
        placeholderIcon={Heart}
        placeholderColors="bg-accent text-on-accent"
      />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold text-muted">Playlist</p>
        <h1 className="font-display text-5xl font-bold break-words">Liked Songs</h1>
        <p className="text-sm text-muted">{details.join(" · ")}</p>
      </div>
    </header>
  )
}
