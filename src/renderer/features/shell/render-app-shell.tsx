import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Stream, type Layer, type ManagedRuntime } from "effect"
import type { ReactNode } from "react"
import type { DesktopApi } from "../../../preload/desktop-api"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext, type RendererServices } from "../../lib/renderer-runtime"
import type { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { defaultPlayOnThisComputer } from "../this-computer/play-on-this-computer-context"
import type { WebPlaybackSdk } from "../this-computer/web-playback-sdk"
import { AppShell } from "./app-shell"

interface AppShellRuntimeOptions {
  readonly mainProcess?: DesktopApi
  readonly spotify?: (spotify: SpotifyApi["Service"]) => Partial<SpotifyApi["Service"]>
  readonly webPlaybackSdk?: Layer.Layer<WebPlaybackSdk>
}

// The library is left empty because no test of the shell reads it, and
// rendering the fixtures' sixty-odd entries in the sidebar ran the first test
// past its timeout on a busy machine. Without a given main process, the
// runtime gets a fresh one, so a test never reads settings another test saved.
export const appShellRuntimeWith = ({
  spotify = () => ({}),
  ...runtimeOptions
}: AppShellRuntimeOptions) =>
  fakeRendererRuntime({
    spotifyApi: spotifyApiFakeWith((fakeSpotify) => ({
      currentUserPlaylists: Stream.empty,
      savedAlbums: Stream.empty,
      followedArtists: Stream.empty,
      savedShows: Stream.empty,
      ...spotify(fakeSpotify),
    })),
    ...runtimeOptions,
  })

interface ShellOptions {
  readonly savedSidebarWidth?: number
  readonly savedRightPaneWidth?: number
  readonly savedPlayOnThisComputer?: boolean
  readonly platform?: string
  readonly runtime?: ManagedRuntime.ManagedRuntime<RendererServices, never>
  // Shown under the album page's heading.
  readonly albumPageContent?: ReactNode
}

// Starts on a second page so there is a page to go back to. The returned
// router shows where the shell navigated to.
export const renderAppShell = async ({
  savedSidebarWidth = 280,
  savedRightPaneWidth = 320,
  savedPlayOnThisComputer = defaultPlayOnThisComputer,
  platform = "win32",
  runtime = appShellRuntimeWith({}),
  albumPageContent = null,
}: ShellOptions = {}) => {
  const rootRoute = createRootRoute({
    component: () => (
      <AppShell
        savedSidebarWidth={savedSidebarWidth}
        savedRightPaneWidth={savedRightPaneWidth}
        savedTrackListDensity="comfortable"
        savedPlayOnThisComputer={savedPlayOnThisComputer}
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
  return { ...view, router }
}

export const openQueue = async () => {
  await userEvent.click(await screen.findByRole("button", { name: "Queue" }))
}
