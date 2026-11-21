import { Heart } from "lucide-react"
import type { SummaryArtwork } from "../../ui/artwork-summary"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import type { LibraryEntry } from "./library-entries"

export const libraryEntryArtwork = ({ kind, images }: LibraryEntry): SummaryArtwork => ({
  sources: images,
  placeholderIcon: kind === "liked-songs" ? Heart : spotifyItemKinds[kind].icon,
  round: kind === "artist",
  ...(kind === "liked-songs" ? { placeholderColors: "bg-accent text-on-accent" } : {}),
})
