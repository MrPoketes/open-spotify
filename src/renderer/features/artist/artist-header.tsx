import { MicVocal } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import { useAddToFolder } from "../folders/use-add-to-folder"
import { ContextPlayButton } from "../playback/context-play-button"
import type { Artist } from "../spotify/spotify-artist"

export function ArtistHeader({ artist }: { readonly artist: Artist }) {
  const addToFolder = useAddToFolder()
  return (
    <PageHeader
      kind="Artist"
      title={artist.name}
      cover={{ sources: artist.images, placeholderIcon: MicVocal, isRound: true }}
      menuItems={[addToFolder(artist)]}
      playButton={<ContextPlayButton contextUri={artist.uri} contextName={artist.name} />}
    >
      {artist.genres.length > 0 ? (
        <p className="text-sm text-muted">{artist.genres.join(", ")}</p>
      ) : null}
    </PageHeader>
  )
}
