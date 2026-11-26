import { Context, Effect, Layer, Match } from "effect"
import type { HttpClientResponse } from "effect/http"
import type { AccessTokenError } from "../../../shared/spotify-auth-replies"
import type { SpotifyFailureLog } from "../../../shared/spotify-failure-log"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"
import { describeErrorCause } from "./describe-error-cause"

export type SpotifyFailureForwarder = (failure: SpotifyFailureLog) => Effect.Effect<void>

// Forwards failed Spotify requests to the main process log. `SpotifyApi.layer`
// always provides `mainProcessFailureForwarder` in the running app, so the
// silent default is only used when a caller builds `layerWithoutHttpClient`
// without wiring main-process logging.
export const SpotifyFailureLogForwarder = Context.Reference<SpotifyFailureForwarder>(
  "open-spotify/SpotifyFailureLogForwarder",
  { defaultValue: () => () => Effect.void },
)

export const mainProcessFailureForwarder = Layer.effect(
  SpotifyFailureLogForwarder,
  Effect.gen(function* () {
    const bridge = yield* DesktopBridge
    return (failure) => bridge.logSpotifyFailure(failure).pipe(Effect.ignore)
  }),
)

export const reportSpotifyFailure = Effect.fn("SpotifyApi.reportFailure")(function* (
  forward: SpotifyFailureForwarder,
  failure: SpotifyFailureLog,
) {
  yield* Effect.logWarning("Spotify request failed", failure)
  yield* forward(failure)
})

type ClientFailure =
  | { readonly _tag: "SpotifyRequestError"; readonly cause: unknown }
  | AccessTokenError
  | DesktopBridgeError

const describeClientFailure = Match.typeTags<ClientFailure>()({
  SpotifyRequestError: ({ cause }) => describeErrorCause(cause),
  AccessTokenUnavailable: ({ message }) => `AccessTokenUnavailable: ${message}`,
  DesktopBridgeError: ({ channel, cause }) =>
    `DesktopBridgeError (${channel}): ${describeErrorCause(cause)}`,
  NotLoggedIn: ({ _tag }) => _tag,
  SessionExpired: ({ _tag }) => _tag,
})

export const reportClientFailure = (
  forward: SpotifyFailureForwarder,
  url: string,
  error: ClientFailure,
) =>
  reportSpotifyFailure(forward, {
    url,
    status: null,
    spotifyMessage: null,
    spotifyReason: null,
    cause: describeClientFailure(error),
  })

export const reportDecodeFailure = (
  forward: SpotifyFailureForwarder,
  response: HttpClientResponse.HttpClientResponse,
  cause: unknown,
) =>
  reportSpotifyFailure(forward, {
    url: response.request.url,
    status: response.status,
    spotifyMessage: null,
    spotifyReason: null,
    cause: describeErrorCause(cause),
  })
