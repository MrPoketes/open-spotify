import { Context, Effect, Layer, Semaphore } from "effect"
import type { AccessTokenError, LogInError } from "../../shared/spotify-auth-replies"
import type { Settings } from "../settings"
import { freshAccessToken } from "./fresh-access-token"
import { logIn } from "./log-in"
import type { SpotifyTokenEndpoint } from "./spotify-token-endpoint"
import type { SystemBrowser } from "./system-browser"
import { type TokenStorageError, TokenStore } from "./token-store"

// The user's Spotify login. The refresh token never leaves the main process:
// the renderer only ever receives access tokens.
export class SpotifySession extends Context.Service<
  SpotifySession,
  {
    readonly logIn: Effect.Effect<void, LogInError>
    readonly getAccessToken: Effect.Effect<string, AccessTokenError>
    readonly logOut: Effect.Effect<void, TokenStorageError>
  }
>()("open-spotify/SpotifySession") {
  static readonly layer = Layer.effect(
    SpotifySession,
    Effect.gen(function* () {
      const services = yield* Effect.context<
        Settings | SpotifyTokenEndpoint | SystemBrowser | TokenStore
      >()
      const tokenStore = yield* TokenStore
      // Spotify may rotate the refresh token, so two refreshes running at once
      // could both spend the same one, and the second would end the session.
      const sessionLock = yield* Semaphore.make(1)

      return SpotifySession.of({
        logIn: logIn.pipe(Effect.provideContext(services)),
        getAccessToken: sessionLock
          .withPermit(freshAccessToken)
          .pipe(Effect.provideContext(services)),
        logOut: sessionLock.withPermit(tokenStore.clear),
      })
    }),
  )
}
