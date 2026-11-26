import { redirect } from "@tanstack/react-router"
import { Effect, Option, type ManagedRuntime } from "effect"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { loginDestinationFor } from "./login-destination"

const findRedirectDestination = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const clientId = yield* bridge.getSetting("spotifyClientId")
  if (Option.isNone(clientId)) {
    return { to: "/onboarding" } as const
  }
  return yield* bridge.getAccessToken.pipe(
    Effect.as(null),
    Effect.catchTags({
      NotLoggedIn: (error) => Effect.succeed(loginDestinationFor(error)),
      SessionExpired: (error) => Effect.succeed(loginDestinationFor(error)),
      // The main process keeps the session when Spotify is unreachable for a
      // moment, so the user is still logged in.
      AccessTokenUnavailable: () => Effect.succeed(null),
    }),
  )
})

// A route's beforeLoad runs on every visit, so a session that expired since
// the last visit is caught. The redirect is thrown, as TanStack Router
// documents, because TanStack Start's types reject a returned one: whatever
// beforeLoad returns becomes route context, which must be serializable.
export const redirectUnlessLoggedIn =
  (runtime: Pick<ManagedRuntime.ManagedRuntime<DesktopBridge, never>, "runPromise">) =>
  async () => {
    const destination = await runtime.runPromise(findRedirectDestination)
    if (destination !== null) {
      throw redirect(destination)
    }
  }
