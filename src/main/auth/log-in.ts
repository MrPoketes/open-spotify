import { Duration, Effect, Option } from "effect"
import { ClientIdMissing, LoginFailed, LoginTimedOut } from "../../shared/spotify-auth-replies"
import { Settings } from "../settings"
import { makeAuthorizationRequest } from "./authorization-request"
import { listenForAuthorizationCode } from "./callback-server"
import { SpotifyTokenEndpoint } from "./spotify-token-endpoint"
import { SystemBrowser } from "./system-browser"
import { TokenStore, makeStoredSession } from "./token-store"

const loginTimeout = Duration.minutes(5)

// The cause is logged because the renderer only receives the message.
const loginFailed = (message: string) => (cause: unknown) =>
  Effect.logWarning(message, cause).pipe(Effect.andThen(Effect.fail(new LoginFailed({ message }))))

const readClientId = Effect.gen(function* () {
  const settings = yield* Settings
  const clientId = yield* settings.get("spotifyClientId")
  if (Option.isNone(clientId)) {
    return yield* new ClientIdMissing()
  }
  return clientId.value
})

export const logIn = Effect.gen(function* () {
  const browser = yield* SystemBrowser
  const tokenEndpoint = yield* SpotifyTokenEndpoint
  const tokenStore = yield* TokenStore

  const clientId = yield* readClientId
  const authorization = yield* makeAuthorizationRequest(clientId)
  const awaitAuthorizationCode = yield* listenForAuthorizationCode(authorization.state)
  yield* browser.open(authorization.url)
  const code = yield* awaitAuthorizationCode.pipe(
    Effect.timeoutOrElse({
      duration: loginTimeout,
      orElse: () => Effect.fail(new LoginTimedOut()),
    }),
  )
  const issuedTokens = yield* tokenEndpoint.exchangeCode({
    clientId,
    code,
    codeVerifier: authorization.codeVerifier,
  })
  const session = yield* makeStoredSession({
    clientId,
    refreshToken: issuedTokens.refresh_token,
    accessToken: issuedTokens.access_token,
    expiresInSeconds: issuedTokens.expires_in,
  })
  yield* tokenStore.save(session)
}).pipe(
  Effect.scoped,
  Effect.catchTags({
    SqlError: loginFailed("Could not read the saved Client ID."),
    SchemaError: loginFailed("Could not read the saved Client ID."),
    BrowserOpenError: loginFailed("Could not open the browser."),
    TokenRequestRejected: (rejection) =>
      loginFailed(`Spotify refused to finish the login (${rejection.error}).`)(rejection),
    TokenRequestFailed: loginFailed("Could not reach Spotify to finish the login."),
    TokenStorageError: loginFailed("Could not save the Spotify session securely."),
  }),
)
