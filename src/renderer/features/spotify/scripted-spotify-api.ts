import { Effect, Layer } from "effect"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http"
import type { AccessTokenError } from "../../../shared/spotify-auth-replies"
import type { DesktopBridgeError } from "../../lib/desktop-bridge"
import { SpotifyAccessToken } from "./spotify-access-token"
import { SpotifyApi } from "./spotify-api"
import { spotifyFakeAccessToken } from "./spotify-fake-server"

export const spotifyApiUsing = (client: HttpClient.HttpClient) =>
  SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([Layer.succeed(HttpClient.HttpClient, client), spotifyFakeAccessToken]),
  )

// Fails every request the way fetch does when Spotify cannot be reached.
export const offlineSpotifyClient = (cause: unknown = new TypeError("Failed to fetch")) =>
  HttpClient.make((request) =>
    Effect.fail(
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({ request, cause }),
      }),
    ),
  )

export const spotifyApiWithTokenFailure = (error: AccessTokenError | DesktopBridgeError) =>
  SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([
      Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make(() => Effect.die("should not send without a token")),
      ),
      Layer.succeed(SpotifyAccessToken, { get: Effect.fail(error) }),
    ]),
  )

interface ScriptedResponse {
  readonly status: number
  // Null for statuses such as 204 that must not carry a body.
  readonly body: string | null
  readonly headers?: Record<string, string>
}

// Answers the n-th request with the n-th scripted response. An unscripted
// request is a bug in the test, so it dies.
export const scriptedSpotify = (responses: ReadonlyArray<ScriptedResponse>) => {
  let requestCount = 0
  const client = HttpClient.make((request) => {
    const scripted = responses[requestCount]
    requestCount += 1
    if (scripted === undefined) {
      return Effect.die(`Unscripted request to ${request.url}`)
    }
    const { status, body, headers } = scripted
    return Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(body, { status, headers: headers ?? {} })),
    )
  })
  return { requestCount: () => requestCount, layer: spotifyApiUsing(client) }
}
