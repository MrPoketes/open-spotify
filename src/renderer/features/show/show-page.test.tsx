import { act, render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Layer, ManagedRuntime } from "effect"
import { HttpClient, HttpClientError } from "effect/http"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { SpotifyApi } from "../spotify/spotify-api"
import { spotifyFakeAccessToken, spotifyFakeServer } from "../spotify/spotify-fake-server"
import { ShowPage } from "./show-page"

type IntersectionCallback = (entries: ReadonlyArray<{ readonly isIntersecting: boolean }>) => void

// jsdom has no IntersectionObserver. This one reports that the observed
// element is visible only when a test scrolls to it.
const intersectionCallbacks = new Set<IntersectionCallback>()

class FakeIntersectionObserver {
  readonly #callback: IntersectionCallback
  constructor(callback: IntersectionCallback) {
    this.#callback = callback
  }
  observe() {
    intersectionCallbacks.add(this.#callback)
  }
  disconnect() {
    intersectionCallbacks.delete(this.#callback)
  }
}

const scrollToEndOfEpisodes = () => {
  act(() => {
    for (const callback of intersectionCallbacks) {
      callback([{ isIntersecting: true }])
    }
  })
}

beforeEach(() => {
  intersectionCallbacks.clear()
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
})

// Serves the fixtures while online and fails like fetch does while offline.
const spotifyWithConnection = () => {
  let online = true
  const switchableClient = Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const fakeServer = yield* HttpClient.HttpClient
      return HttpClient.make((request) => {
        if (online) {
          return fakeServer.execute(request)
        }
        const reason = new HttpClientError.TransportError({ request, description: "Offline" })
        return Effect.fail(new HttpClientError.HttpClientError({ reason }))
      })
    }),
  ).pipe(Layer.provide(spotifyFakeServer))
  return {
    layer: SpotifyApi.layerWithoutHttpClient.pipe(
      Layer.provide([switchableClient, spotifyFakeAccessToken]),
    ),
    setOnline: (isOnline: boolean) => {
      online = isOnline
    },
  }
}

const renderShowPage = (showId: string, spotifyApi = SpotifyApi.layerFake) => {
  const desktopBridge = Layer.succeed(DesktopBridge)(DesktopBridge.make(fakeMainProcess()))
  const runtime = ManagedRuntime.make(Layer.mergeAll(spotifyApi, desktopBridge))
  render(
    <RendererRuntimeContext value={runtime}>
      <ShowPage showId={showId} />
    </RendererRuntimeContext>,
  )
}

const episodeRows = () => screen.getAllByRole("article")

describe("ShowPage", () => {
  it("shows the show's header and the first page of its episodes", async () => {
    renderShowPage("fake-show-slow-science")

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Slow Science")
    expect(screen.getByText(/how scientists actually find things out/)).toBeInTheDocument()
    expect(episodeRows()).toHaveLength(50)
    const latestEpisode = screen.getByRole("article", { name: "Tide Pools, part 1" })
    expect(latestEpisode).toHaveTextContent("20 min")
    expect(within(latestEpisode).getByRole("time")).toHaveAttribute("datetime", "2026-11-16")
  })

  it("loads the next page when the end of the episode list scrolls into view", async () => {
    renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    scrollToEndOfEpisodes()

    // 60 episodes, one of which Spotify no longer serves.
    await waitFor(() => expect(episodeRows()).toHaveLength(59))
  })

  it("expands an episode's full description", async () => {
    renderShowPage("fake-show-slow-science")
    const latestEpisode = await screen.findByRole("article", { name: "Tide Pools, part 1" })

    await userEvent.click(within(latestEpisode).getByRole("button", { name: "Show more" }))

    expect(within(latestEpisode).getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  // Show notes come from podcast publishers, so markup in them must never run.
  it("shows an HTML description as text instead of markup", async () => {
    renderShowPage("fake-show-slow-science")
    const episode = await screen.findByRole("article", { name: "Lichen, part 1" })

    expect(within(episode).getByText(/<b>bold claims<\/b>/)).toBeInTheDocument()
    expect(within(episode).queryByText("bold claims")).not.toBeInTheDocument()
  })

  it("says so when a show has no episodes", async () => {
    renderShowPage("fake-show-long-edit")

    expect(await screen.findByText("This show has no episodes yet.")).toBeInTheDocument()
  })

  it("moves between episodes with the arrow keys and j and k", async () => {
    renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    await userEvent.tab()
    expect(episodeRows()[0]).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}j")
    expect(episodeRows()[2]).toHaveFocus()
    await userEvent.keyboard("k")
    expect(episodeRows()[1]).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(episodeRows()[49]).toHaveFocus()
  })

  it("leaves Ctrl+K to the app-wide shortcut", async () => {
    renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    await userEvent.tab()
    await userEvent.keyboard("{Control>}k{/Control}{Control>}{ArrowDown}{/Control}")

    expect(episodeRows()[0]).toHaveFocus()
  })

  // Only the active row is a tab stop, so Tab leaves the list instead of
  // walking through every episode.
  it("keeps the episode list to one tab stop", async () => {
    renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    const latestEpisode = screen.getByRole("article", { name: "Tide Pools, part 1" })

    await userEvent.tab()
    await userEvent.tab()
    expect(within(latestEpisode).getByRole("button", { name: "Show more" })).toHaveFocus()
    await userEvent.tab()

    // Nothing focusable follows the list on this page, so focus leaves the document.
    expect(document.body).toHaveFocus()
  })

  it("shows an error when the show cannot load, and loads it on retry", async () => {
    const spotify = spotifyWithConnection()
    spotify.setOnline(false)
    renderShowPage("fake-show-slow-science", spotify.layer)

    expect(await screen.findByRole("alert")).toHaveTextContent("This show didn't load.")
    spotify.setOnline(true)
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Slow Science")
  })

  it("shows an error when the next page cannot load, and loads it on retry", async () => {
    const spotify = spotifyWithConnection()
    renderShowPage("fake-show-slow-science", spotify.layer)
    await screen.findByRole("heading", { level: 1 })

    spotify.setOnline(false)
    scrollToEndOfEpisodes()
    expect(await screen.findByRole("alert")).toHaveTextContent("More episodes didn't load.")
    spotify.setOnline(true)
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    await waitFor(() => expect(episodeRows()).toHaveLength(59))
  })
})
