import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import type { Layer } from "effect"
import type { ReactNode } from "react"
import type { DesktopApi } from "../../preload/desktop-api"
import { SpotifyApi } from "../features/spotify/spotify-api"
import { fakeRendererRuntime } from "./fake-renderer-runtime"
import { RendererRuntimeContext } from "./renderer-runtime"

// Renders a screen the way the app does, inside a router and with a runtime
// whose DesktopBridge talks to the given fake main process and whose
// SpotifyApi serves fake data unless the test gives its own. The returned
// router shows where the screen navigated to.
export const renderScreen = (
  screen: ReactNode,
  mainProcess: DesktopApi,
  spotifyApi: Layer.Layer<SpotifyApi> = SpotifyApi.layerFake,
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
  render(
    <RendererRuntimeContext value={fakeRendererRuntime({ mainProcess, spotifyApi })}>
      <RouterProvider router={router} />
    </RendererRuntimeContext>,
  )
  return router
}
