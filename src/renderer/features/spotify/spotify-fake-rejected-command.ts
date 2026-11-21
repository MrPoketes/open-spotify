import { Effect } from "effect"
import { SpotifyResponseError } from "./spotify-api"

// For tests: a player command that Spotify refuses, as it does on a
// restricted device.
export const rejectedCommand = Effect.fail(
  new SpotifyResponseError({ status: 403, message: "Restricted" }),
)
