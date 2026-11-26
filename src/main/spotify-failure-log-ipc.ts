import { Effect } from "effect"
import { ipcChannels } from "../shared/ipc-channels"
import { SpotifyFailureLog } from "../shared/spotify-failure-log"
import { decodeIpcRequest } from "./decode-ipc-request"

export const logSpotifyFailureFromIpc = Effect.fn("logSpotifyFailureFromIpc")(function* (
  request: unknown,
) {
  const failure = yield* decodeIpcRequest(ipcChannels.logSpotifyFailure, SpotifyFailureLog, request)
  yield* Effect.logWarning("Spotify request failed", failure)
})
