import { createFileRoute } from "@tanstack/react-router"
import { Schema } from "effect"
import { AlbumPage } from "../../features/album/album-page"
import { AlbumSearchParams } from "../../features/album/album-search-params"

export const Route = createFileRoute("/_app/album/$albumId")({
  validateSearch: Schema.toStandardSchemaV1(AlbumSearchParams),
  component: AlbumRoute,
})

// Keyed so that opening another album starts from a fresh page instead of
// showing the previous album while the next one loads.
function AlbumRoute() {
  const { albumId } = Route.useParams()
  const { track } = Route.useSearch()
  return <AlbumPage key={albumId} albumId={albumId} highlightedTrackId={track} />
}
