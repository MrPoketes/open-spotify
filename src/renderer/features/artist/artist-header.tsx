import { PageHeader } from "../../ui/page-header"
import { useAddToFolder } from "../folders/use-add-to-folder"
import { ContextPlayButton } from "../playback/context-play-button"
import type { Artist } from "../spotify/spotify-artist"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"

export function ArtistHeader({ artist }: { readonly artist: Artist }) {
  const addToFolder = useAddToFolder()
  return (
    <PageHeader
      kind={spotifyItemKinds.artist.label}
      title={artist.name}
      cover={{
        sources: artist.images,
        placeholderIcon: spotifyItemKinds.artist.icon,
        isRound: true,
      }}
      details={artist.genres.length > 0 ? [artist.genres.join(", ")] : []}
      menuItems={[addToFolder(artist)]}
      playButton={<ContextPlayButton contextUri={artist.uri} contextName={artist.name} />}
    />
  )
}
