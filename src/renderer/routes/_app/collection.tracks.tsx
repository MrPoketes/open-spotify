import { createFileRoute } from "@tanstack/react-router"
import { LikedSongsPage } from "../../features/liked-songs/liked-songs-page"

export const Route = createFileRoute("/_app/collection/tracks")({
  component: LikedSongsPage,
})
