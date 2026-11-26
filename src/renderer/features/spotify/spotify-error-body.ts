import { Effect, Schema } from "effect"
import type { HttpClientResponse } from "effect/http"

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

const fallbackHttpMessage = (status: number) => `Spotify responded with HTTP ${status}`

const plainTextErrorMessage = (text: string, status: number): string => {
  const trimmed = text.trim()
  if (trimmed === "" || trimmed.startsWith("<")) {
    return fallbackHttpMessage(status)
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
      message: fallbackHttpMessage(response.status),
    })),
  )
