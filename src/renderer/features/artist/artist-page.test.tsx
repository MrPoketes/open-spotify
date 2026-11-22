import { screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  installFakeIntersectionObserver,
  scrollObservedElementsIntoView,
} from "../../lib/fake-intersection-observer"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { failingFirstTime } from "../spotify/failing-first-time"
import { type SpotifyApi, SpotifyRequestError } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { ArtistPage } from "./artist-page"

// jsdom does no layout. At this width the card grid fits four cards on a row.
const gridWidth = 800

beforeEach(() => {
  installFakeIntersectionObserver()
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(gridWidth)
})

const renderArtistPage = (artistId: string, spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(<ArtistPage artistId={artistId} />, fakeMainProcess(), spotifyApi)

// Each card links to its album's page.
const albumLinks = (sectionName: string) =>
  within(screen.getByRole("list", { name: sectionName }))
    .getAllByRole("link")
    .map((card) => card.getAttribute("href"))

const spotifyFailingFirstArtistRequest = spotifyApiFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return { getArtist: (artistId) => failFirst(spotify.getArtist(artistId)) }
})

const spotifyFailingFirstLaterAlbumsPage = spotifyApiFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return {
    getArtistAlbumsPage: (artistId, albumGroup, offset) => {
      const page = spotify.getArtistAlbumsPage(artistId, albumGroup, offset)
      return offset === 0 ? page : failFirst(page)
    },
  }
})

// Fails a moment after the request, as a real one does, so the page shows
// that it is loading before the failure arrives.
const spotifyFailingLaterAlbumsPages = spotifyApiFakeWith((spotify) => ({
  getArtistAlbumsPage: (artistId, albumGroup, offset) =>
    offset === 0
      ? spotify.getArtistAlbumsPage(artistId, albumGroup, offset)
      : Effect.yieldNow.pipe(
          Effect.andThen(Effect.fail(new SpotifyRequestError({ cause: "offline" }))),
        ),
}))

const showAllAlbumsUntilRetry = async () => {
  const albums = await screen.findByRole("region", { name: "Albums" })
  await userEvent.click(within(albums).getByRole("button", { name: "Show all" }))
  scrollObservedElementsIntoView()
  return { albums, retry: await within(albums).findByRole("button", { name: "Retry" }) }
}

describe("ArtistPage", () => {
  it("shows the artist's name and genres", async () => {
    await renderArtistPage("fake-artist-0")

    const header = await screen.findByRole("group", { name: "Northbound Static" })
    expect(
      within(header).getByRole("heading", { name: "Northbound Static", level: 1 }),
    ).toBeInTheDocument()
    expect(within(header).getByText("dream pop, shoegaze")).toBeInTheDocument()
  })

  it("plays the artist from the play button, and pauses them from the same button", async () => {
    await renderArtistPage("fake-artist-0")

    await userEvent.click(await screen.findByRole("button", { name: "Play Northbound Static" }))
    await userEvent.click(await screen.findByRole("button", { name: "Pause Northbound Static" }))

    expect(
      await screen.findByRole("button", { name: "Play Northbound Static" }),
    ).toBeInTheDocument()
  })

  it("shows a row of albums, singles and EPs, and appearances, each linking to its album", async () => {
    await renderArtistPage("fake-artist-0")

    const sectionHeadings = await screen.findAllByRole("heading", { level: 2 })
    expect(sectionHeadings.map((heading) => heading.textContent)).toEqual([
      "Albums",
      "Singles and EPs",
      "Appears On",
    ])
    expect(albumLinks("Albums")).toEqual([
      "/album/fake-album-0",
      "/album/fake-artist-0-album-0",
      "/album/fake-artist-0-album-1",
      "/album/fake-artist-0-album-2",
    ])
    expect(albumLinks("Appears On")).toEqual(["/album/fake-album-2", "/album/fake-album-5"])
    const albumCard = screen.getByRole("link", { name: /^Glass Harbour/ })
    expect(within(albumCard).getByText("2019")).toBeInTheDocument()
  })

  it("leaves out the parts of the discography that have no albums", async () => {
    await renderArtistPage("fake-artist-1")

    expect(await screen.findByRole("heading", { name: "Albums" })).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Show all" })).toBeNull()
  })

  it("says so when Spotify lists no releases for the artist", async () => {
    await renderArtistPage("fake-artist-10")

    expect(
      await screen.findByText("Spotify lists no releases for this artist."),
    ).toBeInTheDocument()
  })

  it("shows every album after Show all, loading the next page at the end of the grid", async () => {
    await renderArtistPage("fake-artist-0")
    const albums = await screen.findByRole("region", { name: "Albums" })

    await userEvent.click(within(albums).getByRole("button", { name: "Show all" }))
    expect(albumLinks("Albums")).toHaveLength(10)
    scrollObservedElementsIntoView()

    expect(await within(albums).findByText("Coastline Sessions, vol. 13")).toBeInTheDocument()
    expect(albumLinks("Albums")).toHaveLength(14)
    expect(within(albums).getByRole("button", { name: "Show fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("keeps the loaded albums and offers Retry when the next page fails", async () => {
    await renderArtistPage("fake-artist-0", spotifyFailingFirstLaterAlbumsPage)
    const albums = await screen.findByRole("region", { name: "Albums" })

    await userEvent.click(within(albums).getByRole("button", { name: "Show all" }))
    scrollObservedElementsIntoView()
    const alert = await within(albums).findByRole("alert")
    expect(alert).toHaveTextContent("More releases didn't load.")
    expect(albumLinks("Albums")).toHaveLength(10)
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await within(albums).findByText("Coastline Sessions, vol. 13")).toBeInTheDocument()
  })

  it("moves focus back to Retry when the page Retry asked for fails again", async () => {
    await renderArtistPage("fake-artist-0", spotifyFailingLaterAlbumsPages)
    const { albums, retry } = await showAllAlbumsUntilRetry()

    await userEvent.click(retry)

    expect(await within(albums).findByRole("button", { name: "Retry" })).toHaveFocus()
  })

  it("moves focus to the first new album when the page Retry asked for loads", async () => {
    await renderArtistPage("fake-artist-0", spotifyFailingFirstLaterAlbumsPage)
    const { albums, retry } = await showAllAlbumsUntilRetry()

    await userEvent.click(retry)

    expect(await within(albums).findByText("Coastline Sessions, vol. 13")).toBeInTheDocument()
    expect(within(albums).getAllByRole("link")[10]).toHaveFocus()
  })

  it("says the artist was not found when Spotify has no artist with the id", async () => {
    await renderArtistPage("fake-artist-missing")

    expect(await screen.findByRole("heading", { name: "Artist not found" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
  })

  it("shows the artist after Retry when loading them failed", async () => {
    await renderArtistPage("fake-artist-0", spotifyFailingFirstArtistRequest)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("This artist didn't load.")
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("heading", { name: "Northbound Static" })).toBeInTheDocument()
  })
})
