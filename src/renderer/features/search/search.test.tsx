import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useSearch,
} from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Latch, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { failingFirstTime } from "../spotify/failing-first-time"
import { SpotifyApi } from "../spotify/spotify-api"
import type { SearchType } from "../spotify/spotify-search"
import { giveMainViewALayout } from "../track-list/fake-main-view-layout"
import { SearchField } from "./search-field"
import { SearchPage } from "./search-page"
import { SearchParams } from "./search-params"

interface SearchRequest {
  readonly query: string
  readonly types: ReadonlyArray<SearchType>
  readonly offset: number
}

// The fake Spotify API, recording every search it runs. Searches for
// slowQuery wait until the test releases them.
const recordingSpotify = ({ slowQuery = "", failFirstSearch = false } = {}) => {
  const searches: Array<SearchRequest> = []
  const slowSearchLatch = Latch.makeUnsafe(false)
  const failFirst = failingFirstTime()
  const layer = SpotifyApi.layerFakeWith((spotify) => ({
    search: (query, types, offset) => {
      const search = Effect.suspend(() => {
        searches.push({ query, types, offset })
        return spotify.search(query, types, offset)
      })
      const delayed = query === slowQuery ? slowSearchLatch.whenOpen(search) : search
      return failFirstSearch ? failFirst(delayed) : delayed
    },
  }))
  return { searches, releaseSlowSearch: () => Latch.openUnsafe(slowSearchLatch), layer }
}

const SearchRoute = () => {
  const { q } = useSearch({ strict: false })
  return <SearchPage query={q ?? ""} />
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <SearchField />
      <main ref={giveMainViewALayout}>
        <Outlet />
      </main>
    </>
  ),
})
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  validateSearch: Schema.toStandardSchemaV1(SearchParams),
  component: SearchRoute,
})
const albumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/album/$albumId",
  component: () => <h1>Album</h1>,
})
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <h1>Home</h1>,
})

const renderSearch = async (spotify = recordingSpotify()) => {
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, searchRoute, albumRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <RendererRuntimeContext
      value={fakeRendererRuntime({ mainProcess: fakeMainProcess(), spotifyApi: spotify.layer })}
    >
      <RouterProvider router={router} />
    </RendererRuntimeContext>,
  )
  await screen.findByRole("heading", { name: "Home" })
  return { router, spotify }
}

const searchField = () => screen.getByRole("searchbox", { name: "Search" })

const typeSearch = async (text: string) => {
  await userEvent.clear(searchField())
  await userEvent.type(searchField(), text)
}

const allTypes = ["track", "artist", "album", "playlist"]

const trackRows = () =>
  within(screen.getByRole("table", { name: "Tracks" }))
    .getAllByRole("row")
    .slice(1)

const cardLinks = (sectionName: string) =>
  within(screen.getByRole("list", { name: sectionName }))
    .getAllByRole("link")
    .map((card) => card.getAttribute("href"))

describe("Search", () => {
  it("searches once, after the user pauses typing", async () => {
    const { router, spotify } = await renderSearch()

    await typeSearch("glass")

    expect(await screen.findByRole("heading", { name: "Results for “glass”" })).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: /^Glass Harbour/ })).toBeInTheDocument()
    expect(router.state.location.href).toBe("/search?q=glass")
    expect(spotify.searches).toEqual([{ query: "glass", types: allTypes, offset: 0 }])
  })

  it("shows results in sections that link to artist, album, and playlist pages", async () => {
    await renderSearch()

    await typeSearch("the")

    await screen.findByRole("region", { name: "Artists" })
    expect(cardLinks("Artists")).toEqual(["/artist/fake-artist-2", "/artist/fake-artist-4"])
    expect(cardLinks("Albums")).toEqual(["/album/fake-album-2"])
    // The fake also returns a removed playlist, as null, which is left out.
    expect(cardLinks("Playlists")).toEqual(["/playlist/fake-playlist-big-archive"])
    expect(screen.queryByRole("region", { name: "Tracks" })).toBeNull()
  })

  it("loads the next ten results of one section when Load more is pressed", async () => {
    const { spotify } = await renderSearch()
    await typeSearch("quiet")
    const tracks = await screen.findByRole("region", { name: "Tracks" })
    expect(trackRows()).toHaveLength(10)

    await userEvent.click(within(tracks).getByRole("button", { name: "Load more tracks" }))

    await waitFor(() => expect(trackRows()).toHaveLength(20))
    expect(spotify.searches.at(-1)).toEqual({ query: "quiet", types: ["track"], offset: 10 })
  })

  it("says so when nothing matches the query", async () => {
    await renderSearch()

    await typeSearch("zzz")

    expect(await screen.findByText("No results for “zzz”.")).toBeInTheDocument()
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("asks for a query before anything is typed", async () => {
    const { router } = await renderSearch()

    await router.navigate({ to: "/search" })

    expect(
      await screen.findByText("Search for tracks, artists, albums, and playlists."),
    ).toBeInTheDocument()
  })

  it("shows the results after Retry when the search failed", async () => {
    await renderSearch(recordingSpotify({ failFirstSearch: true }))
    await typeSearch("glass")

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Search didn't load.")
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("link", { name: /^Glass Harbour/ })).toBeInTheDocument()
  })

  // Each query's search takes its own time, so an older one can finish last.
  it("keeps showing the latest query's results when an earlier search answers later", async () => {
    const spotify = recordingSpotify({ slowQuery: "quiet" })
    await renderSearch(spotify)
    await typeSearch("quiet")
    await waitFor(() => expect(screen.getByText("Searching…")).toBeInTheDocument())

    await typeSearch("glass")
    await screen.findByRole("link", { name: /^Glass Harbour/ })
    spotify.releaseSlowSearch()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.getByRole("heading", { name: "Results for “glass”" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Tracks" })).toBeNull()
  })

  it("shows the query of the search the user returns to with Back", async () => {
    const { router } = await renderSearch()
    await typeSearch("glass")
    await userEvent.click(await screen.findByRole("link", { name: /^Glass Harbour/ }))
    await screen.findByRole("heading", { name: "Album" })
    await typeSearch("quiet")
    await screen.findByRole("heading", { name: "Results for “quiet”" })

    router.history.back()
    await screen.findByRole("heading", { name: "Album" })
    router.history.back()

    expect(await screen.findByRole("heading", { name: "Results for “glass”" })).toBeInTheDocument()
    expect(searchField()).toHaveValue("glass")
  })

  it("focuses the search field when / is pressed outside a text field", async () => {
    await renderSearch()

    await userEvent.keyboard("/")

    expect(searchField()).toHaveFocus()
    expect(searchField()).toHaveValue("")
  })

  it("clears the field and the results when Escape is pressed", async () => {
    await renderSearch()
    await typeSearch("glass")
    await screen.findByRole("link", { name: /^Glass Harbour/ })

    await userEvent.keyboard("{Escape}")

    expect(searchField()).toHaveValue("")
    expect(
      await screen.findByText("Search for tracks, artists, albums, and playlists."),
    ).toBeInTheDocument()
  })
})
