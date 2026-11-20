import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { Layer, ManagedRuntime } from "effect"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { redirectUnlessLoggedIn } from "./require-login"

// The only setting the guard reads is the Client ID, and a missing setting
// travels as null.
const mainProcessWith = ({
  clientId,
  accessTokenReply,
}: {
  readonly clientId: string | null
  readonly accessTokenReply: unknown
}): DesktopApi => ({
  invoke: (channel) =>
    Promise.resolve(channel === ipcChannels.getAccessToken ? accessTokenReply : clientId),
})

// Visits an app route guarded the way the `_app` layout route is, and returns
// where the router ended up.
const visitAppRoute = async (mainProcess: DesktopApi) => {
  const runtime = ManagedRuntime.make(Layer.succeed(DesktopBridge)(DesktopBridge.make(mainProcess)))
  const rootRoute = createRootRoute()
  const routes = ["/login", "/onboarding"].map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path }),
  )
  const appRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: redirectUnlessLoggedIn(runtime),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([appRoute, ...routes]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  await router.load()
  return router.state.location
}

const accessToken = { _tag: "AccessToken", accessToken: "my-access-token" }

describe("redirectUnlessLoggedIn", () => {
  it("sends the user to onboarding before a Client ID is saved", async () => {
    const location = await visitAppRoute(
      mainProcessWith({ clientId: null, accessTokenReply: accessToken }),
    )

    expect(location.pathname).toBe("/onboarding")
  })

  it("sends the user to login when there is no session", async () => {
    const location = await visitAppRoute(
      mainProcessWith({ clientId: "my-client-id", accessTokenReply: { _tag: "NotLoggedIn" } }),
    )

    expect(location.pathname).toBe("/login")
    expect(location.search).toEqual({})
  })

  it("sends the user to login with an explanation when the session expired", async () => {
    const location = await visitAppRoute(
      mainProcessWith({ clientId: "my-client-id", accessTokenReply: { _tag: "SessionExpired" } }),
    )

    expect(location.pathname).toBe("/login")
    expect(location.search).toEqual({ sessionExpired: true })
  })

  it("lets a logged-in user into the app", async () => {
    const location = await visitAppRoute(
      mainProcessWith({ clientId: "my-client-id", accessTokenReply: accessToken }),
    )

    expect(location.pathname).toBe("/")
  })

  it("keeps the user in the app when Spotify is unreachable for a moment", async () => {
    const location = await visitAppRoute(
      mainProcessWith({
        clientId: "my-client-id",
        accessTokenReply: { _tag: "AccessTokenUnavailable", message: "Could not reach Spotify." },
      }),
    )

    expect(location.pathname).toBe("/")
  })
})
