import { Disc3, Radio } from "lucide-react"
import { ArtworkSummary } from "../../ui/artwork-summary"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { PlayableItem } from "../spotify/spotify-playable-item"

interface PlayableItemSummaryProps {
  readonly item: PlayableItem
}

export function PlayableItemSummary({ item }: PlayableItemSummaryProps) {
  const isTrack = item.type === "track"
  return (
    <ArtworkSummary
      artwork={{
        sources: isTrack ? item.album.images : item.images,
        placeholderIcon: isTrack ? Disc3 : Radio,
        round: false,
      }}
      title={item.name}
      details={isTrack ? formatArtistNames(item.artists) : "Podcast episode"}
    />
  )
}
