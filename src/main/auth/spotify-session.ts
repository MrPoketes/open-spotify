import { Context, Deferred, Effect, Layer, Ref, Semaphore } from "effect"
import {
  type AccessTokenError,
  LoginCancelled,
  type LogInError,
  SessionExpired,
} from "../../shared/spotify-auth-replies"
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
    readonly cancelLogIn: Effect.Effect<void>
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
      // Only one login can listen on the redirect port at a time.
      const loginLock = yield* Semaphore.make(1)
      // The stored session is deleted when Spotify refuses its refresh token,
      // so without this only the first caller would learn that it expired.
      const sessionHasExpired = yield* Ref.make(false)
      // Completing the pending login's signal makes it fail with LoginCancelled.
      const pendingLoginCancellation = yield* Ref.make(yield* Deferred.make<void>())

      const cancelLogIn = Ref.get(pendingLoginCancellation).pipe(
        Effect.flatMap((cancellation) => Deferred.succeed(cancellation, undefined)),
        Effect.asVoid,
      )

      // A new login replaces the pending one, which waits in the browser for
      // up to five minutes and would otherwise keep the port.
      const replacePendingLogIn = Effect.gen(function* () {
        const cancellation = yield* Deferred.make<void>()
        const previousCancellation = yield* Ref.getAndSet(pendingLoginCancellation, cancellation)
        yield* Deferred.succeed(previousCancellation, undefined)
        yield* loginLock
          .withPermit(logIn(sessionLock))
          .pipe(
            Effect.raceFirst(
              Deferred.await(cancellation).pipe(Effect.andThen(Effect.fail(new LoginCancelled()))),
            ),
          )
        yield* Ref.set(sessionHasExpired, false)
      })

      const accessToken = Effect.gen(function* () {
        if (yield* Ref.get(sessionHasExpired)) {
          return yield* new SessionExpired()
        }
        return yield* freshAccessToken
      }).pipe(Effect.tapErrorTag("SessionExpired", () => Ref.set(sessionHasExpired, true)))

      return SpotifySession.of({
        logIn: replacePendingLogIn.pipe(Effect.provideContext(services)),
        cancelLogIn,
        getAccessToken: sessionLock.withPermit(accessToken).pipe(Effect.provideContext(services)),
        logOut: sessionLock
          .withPermit(tokenStore.clear)
          .pipe(Effect.andThen(Ref.set(sessionHasExpired, false))),
      })
    }),
  )
}
