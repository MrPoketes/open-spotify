import type { Effect } from "effect"
import { use } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { useShowStatusMessage } from "../../ui/status-message-context"
import type { SpotifyApiError } from "../spotify/spotify-api"
import { OpenDevicePickerContext } from "./open-device-picker-context"
import type { Player } from "./player"
import { noActiveDeviceFailure, runPlayerCommand } from "./use-player-command"

// Sends a player command from a page, such as playing a track from a list.
// A page has no room for the failure, so it shows as a status message. With
// no active device, the device picker opens too, so the user can choose one
// instead of wondering why nothing plays (docs/design.md).
export function usePlayerCommandFromPage() {
  const runtime = use(RendererRuntimeContext)
  const showStatusMessage = useShowStatusMessage()
  const openDevicePicker = use(OpenDevicePickerContext)

  const showFailure = (error: SpotifyApiError, failureMessage: string) => {
    if (error._tag === "NoActiveDevice") {
      openDevicePicker()
      showStatusMessage({ text: noActiveDeviceFailure, isFailure: true })
      return
    }
    showStatusMessage({ text: failureMessage, isFailure: true })
  }

  return (
    command: (player: Player["Service"]) => Effect.Effect<void, SpotifyApiError>,
    failureMessage: string,
  ) => {
    runtime.runFork(
      runPlayerCommand(command, failureMessage, (error) => showFailure(error, failureMessage)),
    )
  }
}
