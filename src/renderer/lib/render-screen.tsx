import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import type { Layer } from "effect"
import type { ReactNode } from "react"
import type { DesktopApi } from "../../preload/desktop-api"
import type { SpotifyApi } from "../features/spotify/spotify-api"
import { spotifyApiFake } from "../features/spotify/spotify-api-fake"
import { fakeRendererRuntime } from "./fake-renderer-runtime"
import { RendererRuntimeContext } from "./renderer-runtime"

// Renders a screen the way the app does, inside a router and with a runtime
// whose DesktopBridge talks to the given fake main process and whose
// SpotifyApi serves fake data unless the test gives its own. The returned
// router shows where the screen navigated to.
export const renderScreen = async (
  screen: ReactNode,
  mainProcess: DesktopApi,
  spotifyApi: Layer.Layer<SpotifyApi> = spotifyApiFake,
) => {
  const rootRoute = createRootRoute()
  const screenRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/screen",
    component: () => screen,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([screenRoute]),
    history: createMemoryHistory({ initialEntries: ["/screen"] }),
  })
  // A router that has not loaded mounts the screen only once its load
  // resolves, after render() returns. The screen's first render would then
  // run inside the test's first wait, and a busy machine can make it outlast
  // that wait.
  await router.load()
  render(
    <RendererRuntimeContext value={fakeRendererRuntime({ mainProcess, spotifyApi })}>
      <RouterProvider router={router} />
    </RendererRuntimeContext>,
  )
  return router
}
