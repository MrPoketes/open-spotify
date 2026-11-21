import { Disc3, Radio } from "lucide-react"
import { Artwork } from "../../ui/artwork"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { PlayableItem } from "../spotify/spotify-playable-item"

interface PlayableItemSummaryProps {
  readonly item: PlayableItem
}

export function PlayableItemSummary({ item }: PlayableItemSummaryProps) {
  const isTrack = item.type === "track"
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Artwork
        sources={isTrack ? item.album.images : item.images}
        size={40}
        className="rounded-small"
        placeholderIcon={isTrack ? Disc3 : Radio}
      />
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm">{item.name}</p>
        <p className="truncate text-xs text-muted">
          {isTrack ? formatArtistNames(item.artists) : "Podcast episode"}
        </p>
      </div>
    </div>
  )
}
