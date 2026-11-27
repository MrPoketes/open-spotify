import { ArtworkSummary } from "../../ui/artwork-summary"
import type { PlayableItem } from "../spotify/spotify-playable-item"
import { playableItemByline, playableItemSummaryArtwork } from "./playable-item-description"

interface PlayableItemSummaryProps {
  readonly item: PlayableItem
  // What plays has its title in the accent, as in a track list.
  readonly isPlaying?: boolean
}

export function PlayableItemSummary({ item, isPlaying = false }: PlayableItemSummaryProps) {
  return (
    <ArtworkSummary
      artwork={playableItemSummaryArtwork(item)}
      title={isPlaying ? <span className="text-accent">{item.name}</span> : item.name}
      details={playableItemByline(item)}
    />
  )
}
