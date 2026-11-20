import { createFileRoute } from "@tanstack/react-router"
import { ShowPage } from "../../features/show/show-page"

export const Route = createFileRoute("/_app/show/$showId")({
  component: ShowRoute,
})

function ShowRoute() {
  const { showId } = Route.useParams()
  // A new key starts a fresh page when the user goes from one show to another.
  return <ShowPage key={showId} showId={showId} />
}
