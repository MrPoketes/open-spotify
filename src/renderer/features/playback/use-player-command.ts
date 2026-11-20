import { Effect } from "effect"
import { use, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import type { SpotifyApiError } from "../spotify/spotify-api"
import { Player, type QueuedItemGone } from "./player"

type PlayerCommandError = SpotifyApiError | QueuedItemGone

// Failures the user can fix or understand, said the same way whichever
// command hit them.
const failuresByTag: Partial<Record<PlayerCommandError["_tag"], string>> = {
  NoActiveDevice: "No device is playing. Choose a device, then try again.",
  QueuedItemGone: "That item is no longer in the queue.",
}

// Sends commands to the Player and keeps the message for the last one that
// failed, until the next command is sent.
export function usePlayerCommand() {
  const runtime = use(RendererRuntimeContext)
  const [failure, setFailure] = useState<string | null>(null)
  const [isSending, setSending] = useState(false)

  const send = (
    command: (player: Player["Service"]) => Effect.Effect<void, PlayerCommandError>,
    failureMessage: string,
  ) => {
    setFailure(null)
    setSending(true)
    runtime.runFork(
      Effect.gen(function* () {
        const player = yield* Player
        yield* command(player)
      }).pipe(
        Effect.tapError((error) => Effect.logError(failureMessage, error)),
        Effect.catch((error) =>
          Effect.sync(() => setFailure(failuresByTag[error._tag] ?? failureMessage)),
        ),
        Effect.ensuring(Effect.sync(() => setSending(false))),
      ),
    )
  }

  return { failure, isSending, send }
}
