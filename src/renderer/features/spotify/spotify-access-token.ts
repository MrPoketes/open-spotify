import { Context, Effect, Layer, Schedule } from "effect"
import { HttpClient, HttpClientRequest } from "effect/http"
import type { AccessTokenError } from "../../../shared/spotify-auth-replies"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"

// Keeping the token behind its own service lets the API client be tested with
// a fixed token instead of a login.
export class SpotifyAccessToken extends Context.Service<
  SpotifyAccessToken,
  {
    readonly get: Effect.Effect<string, AccessTokenError | DesktopBridgeError>
  }
>()("open-spotify/SpotifyAccessToken") {
  static readonly layer = Layer.effect(
    SpotifyAccessToken,
    Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      return SpotifyAccessToken.of({ get: bridge.getAccessToken })
    }),
  )
}

export const authorizedSpotifyClient = Effect.gen(function* () {
  const accessToken = yield* SpotifyAccessToken
  return (yield* HttpClient.HttpClient).pipe(
    // Effect sends b3 and traceparent headers by default, which Spotify's
    // CORS preflight rejects from both localhost and app://renderer.
    HttpClient.transformResponse(Effect.provideService(HttpClient.TracerPropagationEnabled, false)),
    HttpClient.mapRequestEffect((request) =>
      accessToken.get.pipe(
        Effect.map((token) =>
          request.pipe(HttpClientRequest.bearerToken(token), HttpClientRequest.acceptJson),
        ),
      ),
    ),
    // Spotify sends Retry-After with 429 responses, and retryTransient
    // waits at least that long before the next attempt.
    HttpClient.retryTransient({
      retryOn: "response-only",
      schedule: Schedule.exponential("1 second"),
      times: 3,
    }),
  )
})
