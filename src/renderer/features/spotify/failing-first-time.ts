import { Effect } from "effect"
import { SpotifyRequestError } from "./spotify-api"

const offline = new SpotifyRequestError({ cause: "offline" })

// For tests: fails as if Spotify were unreachable the first time any request
// runs, then lets requests through.
export const failingFirstTime = () => {
  let hasFailed = false
  return <A, E>(request: Effect.Effect<A, E>) =>
    Effect.suspend((): Effect.Effect<A, E | SpotifyRequestError> => {
      if (hasFailed) {
        return request
      }
      hasFailed = true
      return Effect.fail(offline)
    })
}
