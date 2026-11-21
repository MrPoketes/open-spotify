import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { type ManagedRuntime, Stream } from "effect"
import type { ReactNode } from "react"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext, type RendererServices } from "../../lib/renderer-runtime"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { AppShell } from "./app-shell"

// Installed on import, before any test file's code runs, because
// rendererRuntime reads window.desktop when a test uses it. The sidebar and
// the now-playing bar must load from the fake Spotify API, and pane widths
// must be saved where rendererRuntime reads them back.
Object.defineProperty(window, "desktop", { value: fakeMainProcess() })

// The library is left empty because no test of the shell reads it, and
// rendering the fixtures' sixty-odd entries in the sidebar ran the first test
// past its timeout on a busy machine.
const runtimeWithFakeSpotify = fakeRendererRuntime({
  mainProcess: window.desktop,
  spotifyApi: spotifyApiFakeWith(() => ({
    currentUserPlaylists: Stream.empty,
    savedAlbums: Stream.empty,
    followedArtists: Stream.empty,
    savedShows: Stream.empty,
  })),
})

interface ShellOptions {
  readonly savedSidebarWidth?: number
  readonly savedRightPaneWidth?: number
  readonly platform?: string
  readonly runtime?: ManagedRuntime.ManagedRuntime<RendererServices, never>
  // Shown under the album page's heading.
  readonly albumPageContent?: ReactNode
}

// Starts on a second page so there is a page to go back to.
export const renderAppShell = async ({
  savedSidebarWidth = 280,
  savedRightPaneWidth = 320,
  platform = "win32",
  runtime = runtimeWithFakeSpotify,
  albumPageContent = null,
}: ShellOptions = {}) => {
  const rootRoute = createRootRoute({
    component: () => (
      <AppShell
        savedSidebarWidth={savedSidebarWidth}
        savedRightPaneWidth={savedRightPaneWidth}
        savedTrackListDensity="comfortable"
        platform={platform}
      >
        <Outlet />
      </AppShell>
    ),
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <h1>Home</h1>,
  })
  const albumRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/album",
    component: () => (
      <div>
        <h1>Album</h1>
        {albumPageContent}
      </div>
    ),
  })
  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/settings",
    component: () => <h1>Settings</h1>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, albumRoute, settingsRoute]),
    history: createMemoryHistory({ initialEntries: ["/", "/album"], initialIndex: 1 }),
  })
  const view = render(
    <RendererRuntimeContext value={runtime}>
      <RouterProvider router={router} />
    </RendererRuntimeContext>,
  )
  await screen.findByRole("heading", { name: "Album" })
  return view
}

export const openQueue = async () => {
  await userEvent.click(await screen.findByRole("button", { name: "Queue" }))
}
