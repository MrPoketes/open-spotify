import { CardGrid } from "../../ui/card-grid"
import type { Artist } from "../spotify/spotify-artist"
import { artistCard } from "../artist/artist-card"
import { useWithFolderMenu } from "../folders/use-with-folder-menu"
import { TopItemsSection } from "./top-items-section"
import type { TopItems } from "./use-top-items"

export function TopArtistsSection({ topArtists }: { readonly topArtists: TopItems<Artist> }) {
  const withFolderMenu = useWithFolderMenu()
  return (
    <TopItemsSection
      kind="artists"
      topItems={topArtists}
      renderItems={(artists, title) => (
        <CardGrid
          label={title}
          cards={artists.map((artist) => withFolderMenu(artistCard(artist), artist.uri))}
        />
      )}
    />
  )
}
