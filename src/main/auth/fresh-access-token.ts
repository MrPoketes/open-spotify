import { Clock, Duration, Effect, Option } from "effect"
import {
  AccessTokenUnavailable,
  NotLoggedIn,
  SessionExpired,
} from "../../shared/spotify-auth-replies"
import { SpotifyTokenEndpoint } from "./spotify-token-endpoint"
import { TokenStore, makeStoredSession } from "./token-store"

// Refreshing a minute early keeps the token valid for the request the
// renderer is about to make with it.
const refreshMargin = Duration.minutes(1)

// The cause is logged because the renderer only receives the message.
const accessTokenUnavailable = (message: string) => (cause: unknown) =>
  Effect.logWarning(message, cause).pipe(
    Effect.andThen(Effect.fail(new AccessTokenUnavailable({ message }))),
  )

export const freshAccessToken = Effect.gen(function* () {
  const tokenEndpoint = yield* SpotifyTokenEndpoint
  const tokenStore = yield* TokenStore

  const storedSession = yield* tokenStore.load
  if (Option.isNone(storedSession)) {
    return yield* new NotLoggedIn()
  }
  const { clientId, refreshToken, accessToken, accessTokenExpiresAt } = storedSession.value
  const now = yield* Clock.currentTimeMillis
  if (now < accessTokenExpiresAt - Duration.toMillis(refreshMargin)) {
    return accessToken
  }

  const refreshedTokens = yield* tokenEndpoint
    .refresh({ clientId, refreshToken })
    .pipe(
      Effect.catchTag("TokenRequestRejected", () =>
        tokenStore.clear.pipe(Effect.andThen(Effect.fail(new SessionExpired()))),
      ),
    )
  const renewedSession = yield* makeStoredSession({
    clientId,
    refreshToken: refreshedTokens.refresh_token ?? refreshToken,
    accessToken: refreshedTokens.access_token,
    expiresInSeconds: refreshedTokens.expires_in,
  })
  yield* tokenStore.save(renewedSession)
  return renewedSession.accessToken
}).pipe(
  Effect.catchTags({
    TokenStorageError: accessTokenUnavailable("Could not read or save the Spotify session."),
    TokenRequestFailed: accessTokenUnavailable("Could not reach Spotify to refresh the session."),
  }),
)
