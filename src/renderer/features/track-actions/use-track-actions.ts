import { useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use } from "react"
import { RendererRuntimeContext, type RendererServices } from "../../lib/renderer-runtime"
import { writeClipboardText } from "../../lib/write-clipboard-text"
import { type StatusMessage, useShowStatusMessage } from "../../ui/status-message-context"
import { Player } from "../playback/player"
import { SpotifyApi } from "../spotify/spotify-api"
import { useEditablePlaylists } from "./editable-playlists"
import type { TrackActions } from "./track-menu-items"

const trackLink = (trackId: string) => `https://open.spotify.com/track/${trackId}`

// Queueing is a player command, so it needs a device that is playing, and
// only an official Spotify app can become one (decision 0002).
const noActiveDeviceFailure =
  "No device is playing. Start playback in the Spotify app, then try again."

interface Outcome<E> {
  readonly success: string
  readonly failure: (error: E) => string
  readonly failureLog: string
}

// Runs the action and says in the status message whether it worked.
const announcingOutcome = <E>(
  action: Effect.Effect<unknown, E, RendererServices>,
  outcome: Outcome<E>,
  showStatusMessage: (message: StatusMessage) => void,
) =>
  action.pipe(
    Effect.andThen(
      Effect.sync(() => showStatusMessage({ text: outcome.success, isFailure: false })),
    ),
    Effect.catch((error) =>
      Effect.logWarning(outcome.failureLog, error).pipe(
        Effect.andThen(
          Effect.sync(() => showStatusMessage({ text: outcome.failure(error), isFailure: true })),
        ),
      ),
    ),
  )

export function useTrackActions(): TrackActions {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
  const showStatusMessage = useShowStatusMessage()
  const editablePlaylists = useEditablePlaylists()

  const runAnnounced = <E>(
    action: Effect.Effect<unknown, E, RendererServices>,
    outcome: Outcome<E>,
  ) => {
    runtime.runFork(announcingOutcome(action, outcome, showStatusMessage))
  }

  const explainMissingPlaylists = () => {
    if (editablePlaylists.state.status === "failed") {
      editablePlaylists.retry()
      showStatusMessage({ text: "Your playlists didn't load. Trying again.", isFailure: true })
      return
    }
    const text =
      editablePlaylists.state.status === "loading"
        ? "Your playlists are still loading."
        : "You have no playlists to add to."
    showStatusMessage({ text, isFailure: false })
  }

  return {
    addToPlaylist: (trackUri, playlist) =>
      runAnnounced(
        Effect.gen(function* () {
          const spotify = yield* SpotifyApi
          yield* spotify.addToPlaylist(playlist.id, trackUri)
        }),
        {
          success: `Added to ${playlist.name}`,
          failure: () => `Couldn't add to ${playlist.name}.`,
          failureLog: "Could not add the track to a playlist",
        },
      ),
    explainMissingPlaylists,
    addToQueue: (trackUri) =>
      runAnnounced(
        Effect.gen(function* () {
          const player = yield* Player
          yield* player.addToQueue(trackUri)
        }),
        {
          success: "Added to queue",
          failure: (error) =>
            error._tag === "NoActiveDevice" ? noActiveDeviceFailure : "Couldn't add to the queue.",
          failureLog: "Could not add the track to the queue",
        },
      ),
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
    copyLink: (trackId) =>
      runAnnounced(writeClipboardText(trackLink(trackId)), {
        success: "Link copied",
        failure: () => "Couldn't copy the link.",
        failureLog: "Could not copy the track link",
      }),
  }
}
