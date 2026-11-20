import { createFileRoute } from "@tanstack/react-router"
import { ArtistPage } from "../../features/artist/artist-page"

export const Route = createFileRoute("/_app/artist/$artistId")({
  component: ArtistRoute,
})

// Keyed so that opening another artist starts from a fresh page instead of
// showing the previous artist while the next one loads.
function ArtistRoute() {
  const { artistId } = Route.useParams()
  return <ArtistPage key={artistId} artistId={artistId} />
}
