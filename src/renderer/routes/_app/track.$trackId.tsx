import { createFileRoute } from "@tanstack/react-router"
import { TrackPage } from "../../features/track/track-page"

export const Route = createFileRoute("/_app/track/$trackId")({
  component: TrackRoute,
})

function TrackRoute() {
  const { trackId } = Route.useParams()
  return <TrackPage key={trackId} trackId={trackId} />
}
