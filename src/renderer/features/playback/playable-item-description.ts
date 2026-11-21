import type { SummaryArtwork } from "../../ui/artwork-summary"
import { formatArtistNames } from "../spotify/format-artist-names"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import type { PlayableItem } from "../spotify/spotify-playable-item"

// The artwork and the line under the title that describe what plays, the
// same in the app as in the operating system's media overlay.
export const playableItemArtwork = (item: PlayableItem) =>
  item.type === "track" ? item.album.images : item.images

export const playableItemByline = (item: PlayableItem) =>
  item.type === "track" ? formatArtistNames(item.artists) : `${spotifyItemKinds.show.label} episode`

export const playableItemSummaryArtwork = (item: PlayableItem): SummaryArtwork => ({
  sources: playableItemArtwork(item),
  placeholderIcon: item.type === "track" ? spotifyItemKinds.album.icon : spotifyItemKinds.show.icon,
  round: false,
})
