import { useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use } from "react"
import { attemptNavigation } from "../../lib/attempt-navigation"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { writeClipboardText } from "../../lib/write-clipboard-text"
import { useShowStatusMessage } from "../../ui/status-message-context"
import { useRunAnnounced } from "../../ui/use-run-announced"
import { loginDestinationFor } from "../login/login-destination"
import { Player } from "../playback/player"
import { SpotifyApi } from "../spotify/spotify-api"
import { useEditablePlaylists } from "./editable-playlists"
import type { TrackActions } from "./track-menu-items"

const trackLink = (trackId: string) => `https://open.spotify.com/track/${trackId}`

// Queueing is a player command, so it needs a device that is playing, and
// only an official Spotify app can become one (decision 0002).
const noActiveDeviceFailure =
  "No device is playing. Start playback in the Spotify app, then try again."

export function useTrackActions(): TrackActions {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
  const showStatusMessage = useShowStatusMessage()
  const editablePlaylists = useEditablePlaylists()

  const runAnnounced = useRunAnnounced()

  const explainMissingPlaylists = () => {
    if (editablePlaylists.state.status === "failed") {
      const loginDestination = loginDestinationFor(editablePlaylists.state.error)
      if (loginDestination !== null) {
        runtime.runFork(attemptNavigation(() => navigate(loginDestination)))
        return
      }
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
        attemptNavigation(() => navigate({ to: "/artist/$artistId", params: { artistId } })),
      )
    },
    goToAlbum: (albumId) => {
      runtime.runFork(
        attemptNavigation(() => navigate({ to: "/album/$albumId", params: { albumId } })),
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
