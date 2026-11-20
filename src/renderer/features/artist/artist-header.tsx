import { MicVocal } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import type { Artist } from "../spotify/spotify-artist"

export function ArtistHeader({ artist }: { readonly artist: Artist }) {
  return (
    <PageHeader
      kind="Artist"
      title={artist.name}
      cover={{ sources: artist.images, placeholderIcon: MicVocal, isRound: true }}
    >
      {artist.genres.length > 0 ? (
        <p className="text-sm text-muted">{artist.genres.join(", ")}</p>
      ) : null}
    </PageHeader>
  )
}
