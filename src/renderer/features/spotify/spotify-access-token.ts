import { Context, Effect, Layer, Schema } from "effect"
import type { AccessTokenError } from "../../../shared/spotify-auth-replies"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"

export class SpotifyAuthError extends Schema.TaggedError<SpotifyAuthError>()("SpotifyAuthError", {
  message: Schema.String,
}) {}

type TokenError = AccessTokenError | DesktopBridgeError

const fixedMessages: Record<Exclude<TokenError["_tag"], "AccessTokenUnavailable">, string> = {
  NotLoggedIn: "Not logged in to Spotify.",
  SessionExpired: "The Spotify session has expired. Log in again.",
  DesktopBridgeError: "Could not get a Spotify access token from the main process.",
}

const authErrorMessage = (error: TokenError) =>
  error._tag === "AccessTokenUnavailable" ? error.message : fixedMessages[error._tag]

// Keeping the token behind its own service lets the API client be tested with
// a fixed token instead of a login.
export class SpotifyAccessToken extends Context.Service<
  SpotifyAccessToken,
  {
    readonly get: Effect.Effect<string, SpotifyAuthError>
  }
>()("open-spotify/SpotifyAccessToken") {
  static readonly layer = Layer.effect(
    SpotifyAccessToken,
    Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      return SpotifyAccessToken.of({
        get: bridge.getAccessToken.pipe(
          Effect.mapError((error) => new SpotifyAuthError({ message: authErrorMessage(error) })),
        ),
      })
    }),
  )
}
