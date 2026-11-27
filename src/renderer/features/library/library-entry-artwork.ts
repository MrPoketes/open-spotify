import type { SummaryArtwork } from "../../ui/artwork-summary"
import { likedSongsCover } from "../liked-songs/liked-songs-cover"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import type { LibraryEntry } from "./library-entries"

export const libraryEntryArtwork = ({ kind, images }: LibraryEntry): SummaryArtwork => {
  if (kind === "liked-songs") {
    return { ...likedSongsCover, round: false }
  }
  return { sources: images, placeholderIcon: spotifyItemKinds[kind].icon, round: kind === "artist" }
}
