import { Heart } from "lucide-react"

// Spotify has no cover for Liked Songs, so the sidebar row and the page header
// both show this tile: a filled heart on the accent.
export const likedSongsCover = {
  sources: [],
  placeholderIcon: Heart,
  placeholderColors: "bg-accent text-on-accent [&_svg]:fill-current",
}
