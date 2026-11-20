import { createFileRoute } from "@tanstack/react-router"
import { AlbumPage } from "../../features/album/album-page"

export const Route = createFileRoute("/_app/album/$albumId")({
  component: AlbumRoute,
})

// Keyed so that opening another album starts from a fresh page instead of
// showing the previous album while the next one loads.
function AlbumRoute() {
  const { albumId } = Route.useParams()
  return <AlbumPage key={albumId} albumId={albumId} />
}
