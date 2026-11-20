import { useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { writeClipboardText } from "../../lib/write-clipboard-text"
import { useShowStatusMessage } from "../../ui/status-message-context"
import type { TrackActions } from "./track-menu-items"

const trackLink = (trackId: string) => `https://open.spotify.com/track/${trackId}`

export function useTrackActions(): TrackActions {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
  const showStatusMessage = useShowStatusMessage()

  const copyLink = (trackId: string) => {
    runtime.runFork(
      writeClipboardText(trackLink(trackId)).pipe(
        Effect.andThen(
          Effect.sync(() => showStatusMessage({ text: "Link copied", isFailure: false })),
        ),
        Effect.catchTag("ClipboardWriteError", (error) =>
          Effect.logWarning("Could not copy the track link", error).pipe(
            Effect.andThen(
              Effect.sync(() =>
                showStatusMessage({ text: "Couldn't copy the link.", isFailure: true }),
              ),
            ),
          ),
        ),
      ),
    )
  }

  return {
    goToArtist: (artistId) => {
      runtime.runFork(
        Effect.promise(() => navigate({ to: "/artist/$artistId", params: { artistId } })),
      )
    },
    goToAlbum: (albumId) => {
      runtime.runFork(
        Effect.promise(() => navigate({ to: "/album/$albumId", params: { albumId } })),
      )
    },
    copyLink,
  }
}
