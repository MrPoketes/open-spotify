import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientError } from "effect/http"
import { beforeEach, describe, expect, it } from "vitest"
import { SessionExpired } from "../../../shared/spotify-auth-replies"
import {
  installFakeIntersectionObserver,
  scrollObservedElementsIntoView,
} from "../../lib/fake-intersection-observer"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { spotifyFakeAccessToken, spotifyFakeServer } from "../spotify/spotify-fake-server"
import { ShowPage } from "./show-page"

beforeEach(installFakeIntersectionObserver)

// Serves the fixtures while online and fails like fetch does while offline: a
// moment after the request, so the page shows that it is loading first.
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
        return Effect.yieldNow.pipe(
          Effect.andThen(Effect.fail(new HttpClientError.HttpClientError({ reason }))),
        )
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

const renderShowPage = (showId: string, spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(<ShowPage showId={showId} />, fakeMainProcess(), spotifyApi)

const episodeRows = () => screen.getAllByRole("article")

// The page header, its play button, and its More options button come before
// the episodes in the tab order.
const tabToEpisodes = () => userEvent.keyboard("{Tab>4/}")

// Scrolls to the end of the episode list while offline, so the next page fails.
const loadEpisodesUntilRetry = async (spotify: ReturnType<typeof spotifyWithConnection>) => {
  await screen.findByRole("heading", { level: 1 })
  spotify.setOnline(false)
  scrollObservedElementsIntoView()
  return screen.findByRole("button", { name: "Retry" })
}

const spotifyExpiringOnLaterEpisodePages = spotifyApiFakeWith((spotify) => ({
  getShowEpisodePage: (showId, offset) =>
    offset === 0 ? spotify.getShowEpisodePage(showId, offset) : Effect.fail(new SessionExpired()),
}))

describe("ShowPage", () => {
  it("shows the show's header and the first page of its episodes", async () => {
    await renderShowPage("fake-show-slow-science")

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Slow Science")
    expect(screen.getByRole("group", { name: "Slow Science" })).toHaveTextContent(
      "Show · 60 episodes",
    )
    expect(screen.getByText(/how scientists actually find things out/)).toBeInTheDocument()
    expect(episodeRows()).toHaveLength(50)
    const latestEpisode = screen.getByRole("article", { name: "Tide Pools, part 1" })
    expect(latestEpisode).toHaveTextContent("20 min")
    expect(within(latestEpisode).getByRole("time")).toHaveAttribute("datetime", "2026-11-16")
  })

  it("loads the next page when the end of the episode list scrolls into view", async () => {
    await renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    scrollObservedElementsIntoView()

    // 60 episodes, one of which Spotify no longer serves.
    await waitFor(() => expect(episodeRows()).toHaveLength(59))
  })

  it("expands an episode's full description", async () => {
    await renderShowPage("fake-show-slow-science")
    const latestEpisode = await screen.findByRole("article", { name: "Tide Pools, part 1" })

    await userEvent.click(within(latestEpisode).getByRole("button", { name: "Show more" }))

    expect(within(latestEpisode).getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  // Show notes come from podcast publishers, so markup in them must never run.
  it("shows an HTML description as text instead of markup", async () => {
    await renderShowPage("fake-show-slow-science")
    const episode = await screen.findByRole("article", { name: "Lichen, part 1" })

    expect(within(episode).getByText(/<b>bold claims<\/b>/)).toBeInTheDocument()
    expect(within(episode).queryByText("bold claims")).not.toBeInTheDocument()
  })

  it("says so when a show has no episodes", async () => {
    await renderShowPage("fake-show-long-edit")

    expect(await screen.findByText("This show has no episodes yet.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("plays a double-clicked episode within its show and marks it as playing", async () => {
    await renderShowPage("fake-show-slow-science")
    const thirdEpisode = await screen.findByRole("article", { name: "Deep Time, part 1" })

    await userEvent.dblClick(thirdEpisode)

    await waitFor(() => expect(thirdEpisode).toHaveAccessibleDescription("Playing"))
    expect(screen.getByRole("button", { name: "Pause Slow Science" })).toBeInTheDocument()
  })

  it("plays the focused episode when Enter is pressed", async () => {
    await renderShowPage("fake-show-slow-science")
    const secondEpisode = await screen.findByRole("article", { name: "Lichen, part 1" })

    await tabToEpisodes()
    await userEvent.keyboard("{j}{Enter}")

    await waitFor(() => expect(secondEpisode).toHaveAccessibleDescription("Playing"))
  })

  it("moves between episodes with the arrow keys and j and k", async () => {
    await renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    await tabToEpisodes()
    expect(episodeRows()[0]).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}j")
    expect(episodeRows()[2]).toHaveFocus()
    await userEvent.keyboard("k")
    expect(episodeRows()[1]).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(episodeRows()[49]).toHaveFocus()
  })

  it("leaves Ctrl+K to the app-wide shortcut", async () => {
    await renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    await tabToEpisodes()
    await userEvent.keyboard("{Control>}k{/Control}{Control>}{ArrowDown}{/Control}")

    expect(episodeRows()[0]).toHaveFocus()
  })

  // Only the active row is a tab stop, so Tab leaves the list instead of
  // walking through every episode.
  it("keeps the episode list to one tab stop", async () => {
    await renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    const latestEpisode = screen.getByRole("article", { name: "Tide Pools, part 1" })

    await tabToEpisodes()
    await userEvent.tab()
    expect(within(latestEpisode).getByRole("button", { name: "Show more" })).toHaveFocus()
    await userEvent.tab()

    // Nothing focusable follows the list on this page, so focus leaves the document.
    expect(document.body).toHaveFocus()
  })

  it("shows an error when the show cannot load, and loads it on retry", async () => {
    const spotify = spotifyWithConnection()
    spotify.setOnline(false)
    await renderShowPage("fake-show-slow-science", spotify.layer)

    expect(await screen.findByRole("alert")).toHaveTextContent("This show didn't load.")
    spotify.setOnline(true)
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Slow Science")
  })

  it("shows an error when the next page cannot load, and loads it on retry", async () => {
    const spotify = spotifyWithConnection()
    await renderShowPage("fake-show-slow-science", spotify.layer)
    await screen.findByRole("heading", { level: 1 })

    spotify.setOnline(false)
    scrollObservedElementsIntoView()
    expect(await screen.findByRole("alert")).toHaveTextContent("More episodes didn't load.")
    spotify.setOnline(true)
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    await waitFor(() => expect(episodeRows()).toHaveLength(59))
  })

  it("moves focus back to Retry when the page Retry asked for fails again", async () => {
    const spotify = spotifyWithConnection()
    await renderShowPage("fake-show-slow-science", spotify.layer)
    const retry = await loadEpisodesUntilRetry(spotify)

    await userEvent.click(retry)

    expect(await screen.findByRole("button", { name: "Retry" })).toHaveFocus()
  })

  it("moves focus to the first new episode when the page Retry asked for loads", async () => {
    const spotify = spotifyWithConnection()
    await renderShowPage("fake-show-slow-science", spotify.layer)
    const retry = await loadEpisodesUntilRetry(spotify)
    spotify.setOnline(true)

    await userEvent.click(retry)

    await waitFor(() => expect(episodeRows()).toHaveLength(59))
    expect(episodeRows()[50]).toHaveFocus()
  })

  // Pages load as the user scrolls, and moving focus would scroll them away
  // from where they were reading.
  it("leaves focus alone when a page loads as the end of the list scrolls into view", async () => {
    await renderShowPage("fake-show-slow-science")
    await screen.findByRole("heading", { level: 1 })

    scrollObservedElementsIntoView()

    await waitFor(() => expect(episodeRows()).toHaveLength(59))
    expect(document.body).toHaveFocus()
  })

  it("goes to the login screen, saying why, when the session has expired", async () => {
    const router = await renderShowPage(
      "fake-show-slow-science",
      spotifyApiFakeWith(() => ({ getShow: () => Effect.fail(new SessionExpired()) })),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })

  it("goes to the login screen when loading the next page of episodes finds the session has expired", async () => {
    const router = await renderShowPage(
      "fake-show-slow-science",
      spotifyExpiringOnLaterEpisodePages,
    )
    await screen.findByRole("heading", { level: 1 })

    scrollObservedElementsIntoView()

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })
})
