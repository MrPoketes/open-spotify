import { Disc3, Heart, ListMusic, type LucideIcon, MicVocal, Radio } from "lucide-react"
import type { LibraryEntryKind } from "../../../shared/library-layout"
import type { SummaryArtwork } from "../../ui/artwork-summary"
import type { LibraryEntry } from "./library-entries"

const placeholderIcons: Record<LibraryEntryKind, LucideIcon> = {
  "liked-songs": Heart,
  playlist: ListMusic,
  album: Disc3,
  artist: MicVocal,
  show: Radio,
}

export const libraryEntryArtwork = ({ kind, images }: LibraryEntry): SummaryArtwork => ({
  sources: images,
  placeholderIcon: placeholderIcons[kind],
  round: kind === "artist",
  ...(kind === "liked-songs" ? { placeholderColors: "bg-accent text-on-accent" } : {}),
})
