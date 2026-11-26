import { Context, Effect, Layer, Match, Predicate, Schema } from "effect"
import { HttpClientError, type HttpClientResponse } from "effect/http"
import type { AccessTokenError } from "../../../shared/spotify-auth-replies"
import type { SpotifyFailureLog } from "../../../shared/spotify-failure-log"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"

export type SpotifyFailureForwarder = (failure: SpotifyFailureLog) => Effect.Effect<void>

// Forwards failed Spotify requests to the main process log. Defaults to a
// no-op so unit tests over fake HTTP clients do not need DesktopBridge.
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

const SpotifyErrorBody = Schema.fromJsonString(
  Schema.Struct({
    error: Schema.Struct({
      message: Schema.String,
      reason: Schema.optionalKey(Schema.String),
    }),
  }),
)

interface SpotifyErrorDetails {
  readonly message: string
  readonly reason?: string
}

const maxPlainTextLength = 300

const plainTextErrorMessage = (text: string, status: number): string => {
  const trimmed = text.trim()
  if (trimmed === "" || trimmed.startsWith("<")) {
    return `Spotify responded with HTTP ${status}`
  }
  return trimmed.slice(0, maxPlainTextLength)
}

// Spotify normally returns JSON `{ error: { message, reason } }`, but
// development-mode 403 responses can come back as plain text. Proxies and
// outages return HTML, which falls back to a generic HTTP status message.
export const parseSpotifyErrorBody = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<SpotifyErrorDetails> =>
  response.text.pipe(
    Effect.flatMap((text) =>
      Schema.decodeUnknownEffect(SpotifyErrorBody)(text).pipe(
        Effect.map(({ error }): SpotifyErrorDetails => error),
        Effect.orElseSucceed((): SpotifyErrorDetails => ({
          message: plainTextErrorMessage(text, response.status),
        })),
      ),
    ),
    Effect.orElseSucceed((): SpotifyErrorDetails => ({
      message: `Spotify responded with HTTP ${response.status}`,
    })),
  )

const unregisteredUserPattern =
  /not be registered|not registered|developer dashboard|developer\.spotify\.com\/dashboard/i

const premiumRequiredPattern = /\bpremium\b/i

type SpotifyAccessDenial = "userNotRegistered" | "premiumRequired"

export const classifyForbidden = (
  message: string,
  reason: string | undefined,
): SpotifyAccessDenial | null => {
  if (reason === "PREMIUM_REQUIRED" || premiumRequiredPattern.test(message)) {
    return "premiumRequired"
  }
  if (unregisteredUserPattern.test(message)) {
    return "userNotRegistered"
  }
  return null
}

const messageOf = (value: unknown): string | null => {
  if (Predicate.isString(value)) {
    return value.trim() === "" ? null : value.trim()
  }
  if (value instanceof Error && value.message.trim() !== "") {
    return value.message.trim()
  }
  if (Predicate.hasProperty(value, "message") && Predicate.isString(value.message)) {
    return value.message.trim() === "" ? null : value.message.trim()
  }
  return null
}

const httpClientErrorSummary = (error: HttpClientError.HttpClientError): string => {
  const { reason } = error
  if ("cause" in reason && reason.cause !== undefined) {
    const inner = messageOf(reason.cause)
    if (inner !== null) {
      return inner
    }
  }
  if ("description" in reason && reason.description !== undefined && reason.description !== "") {
    return reason.description
  }
  return error.message
}

export const describeErrorCause = (cause: unknown): string => {
  if (HttpClientError.isHttpClientError(cause)) {
    return httpClientErrorSummary(cause)
  }
  return messageOf(cause) ?? String(cause)
}

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
