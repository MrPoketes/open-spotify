import { Context, type Effect, Schema } from "effect"

export class SpotifyAuthError extends Schema.TaggedError<SpotifyAuthError>()("SpotifyAuthError", {
  message: Schema.String,
}) {}

// The login feature provides the real layer. Keeping the token behind its own
// service lets the API client be built and tested before login exists.
export class SpotifyAccessToken extends Context.Service<
  SpotifyAccessToken,
  {
    readonly get: Effect.Effect<string, SpotifyAuthError>
  }
>()("open-spotify/SpotifyAccessToken") {}
