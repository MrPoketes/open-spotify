import { createFileRoute } from "@tanstack/react-router"
import { PlaylistPage } from "../../features/playlist/playlist-page"

export const Route = createFileRoute("/_app/playlist/$playlistId")({
  component: PlaylistRoute,
})

// Keyed so that opening another playlist starts from a fresh page instead of
// showing the previous playlist's tracks while the next one loads.
function PlaylistRoute() {
  const { playlistId } = Route.useParams()
  return <PlaylistPage key={playlistId} playlistId={playlistId} />
}
