import type { GridCard } from "../../ui/card-grid"
import type { Artist } from "../spotify/spotify-artist"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"

export const artistCard = (artist: Artist): GridCard => ({
  key: artist.uri,
  link: { to: "/artist/$artistId", params: { artistId: artist.id } },
  title: artist.name,
  details: spotifyItemKinds.artist.label,
  artwork: artist.images,
  placeholderIcon: spotifyItemKinds.artist.icon,
  roundArtwork: true,
})
