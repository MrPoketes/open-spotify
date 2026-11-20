import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { SpotifyApi } from "./spotify-api"
import { spotifyFakeAccessToken } from "./spotify-fake-server"

export const spotifyApiUsing = (client: HttpClient.HttpClient) =>
  SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([Layer.succeed(HttpClient.HttpClient, client), spotifyFakeAccessToken]),
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
