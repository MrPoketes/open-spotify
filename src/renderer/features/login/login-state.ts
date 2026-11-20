import { Effect, Option } from "effect"
import { DesktopBridge } from "../../lib/desktop-bridge"

export type LoginState = "no-client-id" | "logged-out" | "session-expired" | "logged-in"

export const findLoginState = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const clientId = yield* bridge.getSetting("spotifyClientId")
  if (Option.isNone(clientId)) {
    return "no-client-id"
  }
  return yield* bridge.getAccessToken.pipe(
    Effect.as<LoginState>("logged-in"),
    Effect.catchTags({
      NotLoggedIn: () => Effect.succeed<LoginState>("logged-out"),
      SessionExpired: () => Effect.succeed<LoginState>("session-expired"),
      // The main process keeps the session when Spotify is unreachable for a
      // moment, so the user is still logged in.
      AccessTokenUnavailable: () => Effect.succeed<LoginState>("logged-in"),
    }),
  )
})
