import { ArtworkSummary } from "../../ui/artwork-summary"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { PlayableItem } from "../spotify/spotify-playable-item"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"

interface PlayableItemSummaryProps {
  readonly item: PlayableItem
}

export function PlayableItemSummary({ item }: PlayableItemSummaryProps) {
  const isTrack = item.type === "track"
  return (
    <ArtworkSummary
      artwork={{
        sources: isTrack ? item.album.images : item.images,
        placeholderIcon: isTrack ? spotifyItemKinds.album.icon : spotifyItemKinds.show.icon,
        round: false,
      }}
      title={item.name}
      details={isTrack ? formatArtistNames(item.artists) : `${spotifyItemKinds.show.label} episode`}
    />
  )
}
