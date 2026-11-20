import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { SessionExpired } from "../../../shared/spotify-auth-replies"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { failingFirstTime } from "../spotify/failing-first-time"
import { SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { giveMainViewALayout } from "../track-list/fake-main-view-layout"
import { AlbumPage } from "./album-page"

const renderAlbumPage = (albumId: string, spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(
    // The layout is applied as <main> mounts, before the track list reads it.
    <main ref={giveMainViewALayout}>
      <AlbumPage albumId={albumId} />
    </main>,
    fakeMainProcess(),
    spotifyApi,
  )

// The lines under the title sit beside it, in the element that holds both.
const albumHeader = async (albumName: string) => {
  const title = await screen.findByRole("heading", { name: albumName, level: 1 })
  return title.parentElement ?? title
}

const spotifyFailingFirstAlbumRequest = SpotifyApi.layerFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return { getAlbum: (albumId) => failFirst(spotify.getAlbum(albumId)) }
})

describe("AlbumPage", () => {
  it("shows the album's name, artists, release year, track count, and duration", async () => {
    renderAlbumPage("fake-album-0")

    const header = await albumHeader("Glass Harbour")
    expect(header).toHaveTextContent("Northbound Static · 2019 · 10 tracks · 30 min")
  })

  // Spotify embeds only the first 50 tracks, and the total must count them all.
  it("adds the tracks after the first page to the total duration", async () => {
    renderAlbumPage("fake-album-4")

    const header = await albumHeader("Low Orbit")
    expect(header).toHaveTextContent("Kite Theory · 2016 · 60 tracks · 3 hr 15 min")
  })

  it("links the album's artist to their artist page", async () => {
    renderAlbumPage("fake-album-0")

    const header = await albumHeader("Glass Harbour")
    expect(within(header).getByRole("link", { name: "Northbound Static" })).toHaveAttribute(
      "href",
      "/artist/fake-artist-0",
    )
  })

  it("links each artist of a track with several artists to their own page", async () => {
    const router = renderAlbumPage("fake-album-0")
    const row = await screen.findByRole("row", {
      name: "Glass Harbour, part 1.3 by Northbound Static, Lena Varga",
    })

    expect(within(row).getByRole("link", { name: "Northbound Static" })).toHaveAttribute(
      "href",
      "/artist/fake-artist-0",
    )
    await userEvent.click(within(row).getByRole("link", { name: "Lena Varga" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/artist/fake-artist-1"))
  })

  it("groups the tracks of a two-disc album under a heading for each disc", async () => {
    renderAlbumPage("fake-album-4")

    const discHeadings = await screen.findAllByRole("heading", { level: 2 })
    expect(discHeadings.map((heading) => heading.textContent)).toEqual(["Disc 1", "Disc 2"])
    expect(screen.getByRole("table", { name: "Disc 2" })).toHaveAttribute("aria-rowcount", "31")
  })

  it("shows no disc heading for a single-disc album", async () => {
    renderAlbumPage("fake-album-0")

    expect(await screen.findByRole("table", { name: "Tracks" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
  })

  it("numbers each disc's tracks from 1 and leaves out the album and date-added columns", async () => {
    renderAlbumPage("fake-album-4")

    const secondDisc = await screen.findByRole("table", { name: "Disc 2" })
    expect(within(secondDisc).queryByRole("columnheader", { name: "Album" })).toBeNull()
    expect(within(secondDisc).queryByRole("columnheader", { name: "Date added" })).toBeNull()
    const firstTrack = within(secondDisc).getByRole("row", {
      name: "Low Orbit, part 2.1 by Kite Theory",
    })
    expect(within(firstTrack).getAllByRole("cell")[0]).toHaveTextContent(/^1$/)
  })

  it("says the album was not found when Spotify has no album with the id", async () => {
    renderAlbumPage("fake-album-missing")

    expect(await screen.findByRole("heading", { name: "Album not found" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
  })

  // Spotify rejects an id that cannot be an album's with 400 rather than 404.
  it("says the album was not found when Spotify rejects the id as malformed", async () => {
    renderAlbumPage(
      "not-an-album-id",
      SpotifyApi.layerFakeWith(() => ({
        getAlbum: () =>
          Effect.fail(new SpotifyResponseError({ status: 400, message: "Invalid base62 id" })),
      })),
    )

    expect(await screen.findByRole("heading", { name: "Album not found" })).toBeInTheDocument()
  })

  it("shows the album after Retry when loading it failed", async () => {
    renderAlbumPage("fake-album-0", spotifyFailingFirstAlbumRequest)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("This album didn't load.")
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("heading", { name: "Glass Harbour" })).toBeInTheDocument()
  })

  // Retry cannot bring back a session, so the page sends the user to log in.
  it("goes to the login screen, saying why, when the session has expired", async () => {
    const router = renderAlbumPage(
      "fake-album-0",
      SpotifyApi.layerFakeWith(() => ({ getAlbum: () => Effect.fail(new SessionExpired()) })),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })
})
