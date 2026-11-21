import { screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { failingFirstTime } from "../spotify/failing-first-time"
import type { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyResponseError } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import type { TimeRange } from "../spotify/spotify-listening-history"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { fakeTopArtists, fakeTopTracks } from "../spotify/spotify-listening-history-fixtures"
import { FakeMainView } from "../track-list/fake-main-view"
import { HomePage } from "./home-page"

const renderHomePage = (spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(
    <FakeMainView>
      <HomePage />
    </FakeMainView>,
    fakeMainProcess(),
    spotifyApi,
  )

const cardLinks = (gridName: string) =>
  within(screen.getByRole("list", { name: gridName }))
    .getAllByRole("link")
    .map((card) => card.getAttribute("href"))

// The column header is the first row.
const trackRowNames = (tableName: string) =>
  within(screen.getByRole("table", { name: tableName }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.getAttribute("aria-label"))

const trackRowName = ({ name, artists }: ReturnType<typeof fakeTrack>) =>
  `${name} by ${artists.map((artist) => artist.name).join(", ")}`

const spotifyRecordingTopArtistRanges = () => {
  const requestedRanges: Array<TimeRange> = []
  const spotifyApi = spotifyApiFakeWith((spotify) => ({
    getTopArtists: (timeRange) =>
      Effect.sync(() => requestedRanges.push(timeRange)).pipe(
        Effect.andThen(spotify.getTopArtists(timeRange)),
      ),
  }))
  return { requestedRanges, spotifyApi }
}

const spotifyWithoutLateNightDrive = spotifyApiFakeWith((spotify) => ({
  getPlaylist: (playlistId) =>
    playlistId === "fake-playlist-late-night-drive"
      ? Effect.fail(new SpotifyResponseError({ status: 404, message: "Resource not found" }))
      : spotify.getPlaylist(playlistId),
}))

const spotifyWithoutRecentTopArtists = spotifyApiFakeWith((spotify) => ({
  getTopArtists: (timeRange) =>
    timeRange === "short_term" ? Effect.succeed([]) : spotify.getTopArtists(timeRange),
}))

const spotifyForNewAccount = spotifyApiFakeWith(() => ({
  getRecentlyPlayed: Effect.succeed([]),
  getTopArtists: () => Effect.succeed([]),
  getTopTracks: () => Effect.succeed([]),
}))

const spotifyFailingFirstPlayHistoryRequest = spotifyApiFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return { getRecentlyPlayed: failFirst(spotify.getRecentlyPlayed) }
})

const spotifyFailingFirstAlbumRequest = spotifyApiFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return { getAlbum: (albumId) => failFirst(spotify.getAlbum(albumId)) }
})

const spotifyFailingFirstTopTracksRequest = spotifyApiFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return { getTopTracks: (timeRange) => failFirst(spotify.getTopTracks(timeRange)) }
})

describe("HomePage", () => {
  it("greets the user by their display name", async () => {
    await renderHomePage()

    expect(
      await screen.findByRole("heading", { name: "Hello, Mira Kaelin", level: 1 }),
    ).toBeInTheDocument()
  })

  // The play history repeats contexts, and some contexts have no page: Liked
  // Songs, and plays without a context.
  it("jumps back into each album, playlist, and artist played from once, most recent first, up to eight", async () => {
    await renderHomePage()

    const jumpBackIn = await screen.findByRole("list", { name: "Jump back in" })
    expect(cardLinks("Jump back in")).toEqual([
      "/album/fake-album-0",
      "/playlist/fake-playlist-late-night-drive",
      "/artist/fake-artist-1",
      "/playlist/fake-playlist-big-archive",
      "/album/fake-album-2",
      "/playlist/fake-playlist-morning-coffee",
      "/artist/fake-artist-3",
      "/album/fake-album-4",
    ])
    expect(within(jumpBackIn).getByRole("link", { name: /^Glass Harbour/ })).toBeInTheDocument()
    expect(within(jumpBackIn).getByRole("link", { name: /^Late Night Drive/ })).toBeInTheDocument()
    expect(within(jumpBackIn).getByRole("link", { name: /^Lena Varga/ })).toBeInTheDocument()
  })

  it("leaves a deleted playlist out of Jump back in", async () => {
    await renderHomePage(spotifyWithoutLateNightDrive)

    await screen.findByRole("list", { name: "Jump back in" })
    expect(cardLinks("Jump back in")).not.toContain("/playlist/fake-playlist-late-night-drive")
    expect(cardLinks("Jump back in")).toHaveLength(7)
  })

  it("lists recently played tracks without repeating a track played twice in a row", async () => {
    await renderHomePage()

    await screen.findByRole("table", { name: "Recently played" })
    expect(trackRowNames("Recently played")).toEqual(
      [0, 1, 6, 2, 3, 4, 5, 8, 9, 10].map((index) => trackRowName(fakeTrack(index))),
    )
  })

  it("loads the top artists for the time range the user picks", async () => {
    const { requestedRanges, spotifyApi } = spotifyRecordingTopArtistRanges()
    await renderHomePage(spotifyApi)
    const topArtists = await screen.findByRole("region", { name: "Your top artists" })
    await within(topArtists).findByRole("list", { name: "Your top artists" })

    await userEvent.click(within(topArtists).getByRole("button", { name: "Last 4 weeks" }))

    expect(
      await within(topArtists).findByRole("link", { name: /^Kite Theory/ }),
    ).toBeInTheDocument()
    expect(cardLinks("Your top artists")).toEqual(
      fakeTopArtists.short_term.map(({ id }) => `/artist/${id}`),
    )
    expect(requestedRanges).toEqual(["medium_term", "short_term"])
    expect(within(topArtists).getByRole("button", { name: "Last 4 weeks" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  // Hiding the section would take the switch with it, and the user could not
  // go back to a time range that has artists.
  it("keeps the top artists and their time range switch when the picked range has none", async () => {
    await renderHomePage(spotifyWithoutRecentTopArtists)
    const topArtists = await screen.findByRole("region", { name: "Your top artists" })
    await within(topArtists).findByRole("list", { name: "Your top artists" })

    await userEvent.click(within(topArtists).getByRole("button", { name: "Last 4 weeks" }))
    expect(
      await within(topArtists).findByText("No top artists for this time range yet."),
    ).toBeInTheDocument()
    await userEvent.click(within(topArtists).getByRole("button", { name: "Last 6 months" }))

    expect(
      await within(topArtists).findByRole("list", { name: "Your top artists" }),
    ).toBeInTheDocument()
  })

  it("welcomes a new account with no listening history instead of showing empty sections", async () => {
    await renderHomePage(spotifyForNewAccount)

    expect(await screen.findByText(/^Welcome to Open Spotify\./)).toBeInTheDocument()
    expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([])
  })

  it("keeps the other sections when one fails, and shows it after Retry", async () => {
    await renderHomePage(spotifyFailingFirstTopTracksRequest)
    const topTracks = await screen.findByRole("region", { name: "Your top tracks" })

    const alert = await within(topTracks).findByRole("alert")
    expect(alert).toHaveTextContent("Your top tracks didn't load.")
    expect(await screen.findByRole("list", { name: "Jump back in" })).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Recently played" })).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Your top artists" })).toBeInTheDocument()
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    await within(topTracks).findByRole("table", { name: "Your top tracks" })
    expect(trackRowNames("Your top tracks")).toEqual(fakeTopTracks.medium_term.map(trackRowName))
  })

  // Jump back in and Recently played both come from the play history.
  it("shows the play history failing in both sections it feeds, and loads both after Retry", async () => {
    await renderHomePage(spotifyFailingFirstPlayHistoryRequest)
    const jumpBackIn = await screen.findByRole("region", { name: "Jump back in" })
    const recentlyPlayed = screen.getByRole("region", { name: "Recently played" })

    expect(await within(jumpBackIn).findByRole("alert")).toHaveTextContent(
      "Jump back in didn't load.",
    )
    const recentlyPlayedAlert = within(recentlyPlayed).getByRole("alert")
    expect(recentlyPlayedAlert).toHaveTextContent("Recently played tracks didn't load.")
    await userEvent.click(within(recentlyPlayedAlert).getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("list", { name: "Jump back in" })).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Recently played" })).toBeInTheDocument()
  })

  // The cards are looked up after the play history loads, so they can fail on
  // their own while Recently played, fed by the same history, still shows.
  it("shows a failed card lookup in Jump back in only, and loads the cards after Retry", async () => {
    await renderHomePage(spotifyFailingFirstAlbumRequest)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Jump back in didn't load.")
    expect(screen.getByRole("table", { name: "Recently played" })).toBeInTheDocument()
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    await screen.findByRole("list", { name: "Jump back in" })
    expect(cardLinks("Jump back in")).toHaveLength(8)
  })
})
