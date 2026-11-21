import { ArtworkSummary } from "../../ui/artwork-summary"
import type { PlayableItem } from "../spotify/spotify-playable-item"
import { playableItemByline, playableItemSummaryArtwork } from "./playable-item-description"

interface PlayableItemSummaryProps {
  readonly item: PlayableItem
}

export function PlayableItemSummary({ item }: PlayableItemSummaryProps) {
  return (
    <ArtworkSummary
      artwork={playableItemSummaryArtwork(item)}
      title={item.name}
      details={playableItemByline(item)}
    />
  )
}
