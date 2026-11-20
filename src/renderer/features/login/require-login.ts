import { redirect } from "@tanstack/react-router"
import { Effect, type ManagedRuntime, Option } from "effect"
import { DesktopBridge } from "../../lib/desktop-bridge"

type LoginState = "no-client-id" | "logged-out" | "session-expired" | "logged-in"

const findLoginState = Effect.gen(function* () {
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

// A route's beforeLoad runs on every visit, so a session that expired since
// the last visit is caught. The redirect is thrown, as TanStack Router
// documents, because TanStack Start's types reject a returned one: whatever
// beforeLoad returns becomes route context, which must be serializable.
export const redirectUnlessLoggedIn =
  (runtime: ManagedRuntime.ManagedRuntime<DesktopBridge, never>) => async () => {
    const loginState = await runtime.runPromise(findLoginState)
    switch (loginState) {
      case "no-client-id":
        throw redirect({ to: "/onboarding" })
      case "logged-out":
        throw redirect({ to: "/login" })
      case "session-expired":
        throw redirect({ to: "/login", search: { sessionExpired: true } })
      case "logged-in":
        return
    }
  }
