import { MicVocal } from "lucide-react"
import type { GridCard } from "../../ui/card-grid"
import type { Artist } from "../spotify/spotify-artist"

export const artistCard = (artist: Artist): GridCard => ({
  key: artist.uri,
  link: { to: "/artist/$artistId", params: { artistId: artist.id } },
  title: artist.name,
  details: "Artist",
  artwork: artist.images,
  placeholderIcon: MicVocal,
  roundArtwork: true,
})
