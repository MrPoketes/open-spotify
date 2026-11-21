import { ArtworkSummary } from "../../ui/artwork-summary"
import type { PlayableItem } from "../spotify/spotify-playable-item"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import { playableItemArtwork, playableItemByline } from "./playable-item-description"

interface PlayableItemSummaryProps {
  readonly item: PlayableItem
}

export function PlayableItemSummary({ item }: PlayableItemSummaryProps) {
  return (
    <ArtworkSummary
      artwork={{
        sources: playableItemArtwork(item),
        placeholderIcon:
          item.type === "track" ? spotifyItemKinds.album.icon : spotifyItemKinds.show.icon,
        round: false,
      }}
      title={item.name}
      details={playableItemByline(item)}
    />
  )
}
