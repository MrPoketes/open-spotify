import { Effect } from "effect"
import { use, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import type { SpotifyApiError } from "../spotify/spotify-api"
import { Player } from "./player"

const noActiveDeviceFailure = "No device is playing. Choose a device, then try again."

// Sends commands to the Player and keeps the message for the last one that
// failed, until the next command is sent.
export function usePlayerCommand() {
  const runtime = use(RendererRuntimeContext)
  const [failure, setFailure] = useState<string | null>(null)

  const send = (
    command: (player: Player["Service"]) => Effect.Effect<void, SpotifyApiError>,
    failureMessage: string,
  ) => {
    setFailure(null)
    runtime.runFork(
      Effect.gen(function* () {
        const player = yield* Player
        yield* command(player)
      }).pipe(
        Effect.tapError((error) => Effect.logError(failureMessage, error)),
        Effect.catch((error) =>
          Effect.sync(() =>
            setFailure(error._tag === "NoActiveDevice" ? noActiveDeviceFailure : failureMessage),
          ),
        ),
      ),
    )
  }

  return { failure, send }
}
