import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { NotLoggedIn, SessionExpired } from "../../../shared/spotify-auth-replies"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { type SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { failingFirstTime } from "../spotify/failing-first-time"
import { FakeMainView } from "../track-list/fake-main-view"
import { scrollMainViewToRow } from "../track-list/fake-main-view-layout"
import { PlaylistPage } from "./playlist-page"

const spotifyFailingFirstPlaylistRequest = spotifyApiFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return { getPlaylist: (playlistId) => failFirst(spotify.getPlaylist(playlistId)) }
})

const spotifyFailingFirstPageRequest = spotifyApiFakeWith((spotify) => {
  const failFirst = failingFirstTime()
  return {
    getPlaylistItemsPage: (playlistId, offset) =>
      failFirst(spotify.getPlaylistItemsPage(playlistId, offset)),
  }
})

const renderPlaylistPage = async (playlistId: string, spotifyApi?: Layer.Layer<SpotifyApi>) => {
  const router = renderScreen(
    <FakeMainView>
      <PlaylistPage playlistId={playlistId} />
    </FakeMainView>,
    fakeMainProcess(),
    spotifyApi,
  )
  const mainView = await screen.findByRole("main")
  return { mainView, router }
}

const trackRows = () => within(screen.getByRole("table", { name: "Tracks" })).getAllByRole("row")

const renderedRowIndexes = () => trackRows().map((row) => row.getAttribute("aria-rowindex"))

// The playlist's play button comes before the tracks in the tab order.
const tabToTracks = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.tab()
  await user.tab()
}

describe("PlaylistPage", () => {
  it("shows the playlist's name, description, owner, track count, and duration", async () => {
    await renderPlaylistPage("fake-playlist-late-night-drive")

    expect(
      await screen.findByRole("heading", { name: "Late Night Drive", level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText("Long roads & low lights.")).toBeInTheDocument()
    // 100 of the 120 tracks arrive with the playlist, so the total is estimated.
    expect(
      screen.getByText(/^Mira Kaelin · 120 tracks · about \d+ hr \d+ min$/),
    ).toBeInTheDocument()
  })

  it("shows the exact total duration when every track arrives with the playlist", async () => {
    await renderPlaylistPage("fake-playlist-morning-coffee")

    expect(await screen.findByText("Mira Kaelin · 15 tracks · 1 hr 26 min")).toBeInTheDocument()
  })

  it("loads the next page of tracks when the list scrolls to them", async () => {
    const { mainView } = await renderPlaylistPage("fake-playlist-late-night-drive")
    await screen.findByRole("table", { name: "Tracks" })
    expect(screen.queryByRole("row", { name: "Quiet Echoes by Juniper Hollow" })).toBeNull()

    scrollMainViewToRow(mainView, 120)

    expect(
      await screen.findByRole("row", { name: "Quiet Echoes by Juniper Hollow" }),
    ).toHaveAttribute("aria-rowindex", "121")
  })

  it("keeps only the rows near the screen in the DOM for a 1,000-track playlist", async () => {
    const { mainView } = await renderPlaylistPage("fake-playlist-big-archive")
    await screen.findByRole("table", { name: "Tracks" })

    scrollMainViewToRow(mainView, 500)
    await waitFor(() => expect(renderedRowIndexes()).toContain("501"))

    // The header row, the rows on screen, and a few beyond each edge.
    expect(trackRows().length).toBeLessThan(40)
    expect(screen.getByRole("table", { name: "Tracks" })).toHaveAttribute("aria-rowcount", "1001")
  })

  it("moves focus between rows with the arrow keys and jumps with End and Home", async () => {
    await renderPlaylistPage("fake-playlist-late-night-drive")
    await screen.findByRole("table", { name: "Tracks" })
    const user = userEvent.setup()

    await tabToTracks(user)
    await user.keyboard("{ArrowDown}")
    expect(trackRows()[2]).toHaveFocus()

    await user.keyboard("{End}")
    // The last row stays focused when its page arrives and replaces the placeholder.
    expect(await screen.findByRole("row", { name: "Quiet Echoes by Juniper Hollow" })).toHaveFocus()

    await user.keyboard("{Home}")
    expect(
      await screen.findByRole("row", { name: "Quiet Rivers by Northbound Static" }),
    ).toHaveFocus()
  })

  // Tabbing back into the list must not jump the page to a row out of sight.
  it("makes the first row on screen the tab stop after the focused row scrolls away", async () => {
    const { mainView } = await renderPlaylistPage("fake-playlist-big-archive")
    await screen.findByRole("table", { name: "Tracks" })

    scrollMainViewToRow(mainView, 500)
    await waitFor(() => expect(renderedRowIndexes()).toContain("502"))

    const tabStops = trackRows().filter((row) => row.tabIndex === 0)
    expect(tabStops.map((row) => row.getAttribute("aria-rowindex"))).toEqual(["502"])
  })

  // A single removed track or podcast episode must not break the list.
  it("shows removed tracks, local files, and podcast episodes as rows", async () => {
    await renderPlaylistPage("fake-playlist-morning-coffee")
    await screen.findByRole("table", { name: "Tracks" })

    expect(screen.getByRole("row", { name: "Unavailable track" })).toBeInTheDocument()
    expect(screen.getByRole("row", { name: "Demo Take 3 by Mira Kaelin" })).toHaveTextContent(
      "3:04",
    )
    expect(screen.getByRole("row", { name: "How Playlists Are Made" })).toHaveTextContent("40:12")
  })

  it("opens a track's album page from its album name", async () => {
    const { router } = await renderPlaylistPage("fake-playlist-late-night-drive")
    const row = await screen.findByRole("row", { name: "Quiet Rivers by Northbound Static" })

    await userEvent.click(within(row).getByRole("link", { name: "Glass Harbour" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/album/fake-album-0"))
  })

  it("opens a track's artist page from the artist's name", async () => {
    const { router } = await renderPlaylistPage("fake-playlist-late-night-drive")
    const row = await screen.findByRole("row", { name: "Quiet Rivers by Northbound Static" })

    await userEvent.click(within(row).getByRole("link", { name: "Northbound Static" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/artist/fake-artist-0"))
  })

  // The fake player starts on the playlist's first track. Playing the fifth
  // in the playlist's context makes the playlist's play button its pause
  // button, which an offset alone or a list of tracks would not.
  it("plays a double-clicked track within the playlist and marks its row as playing", async () => {
    await renderPlaylistPage("fake-playlist-late-night-drive")
    const firstRow = await screen.findByRole("row", { name: "Quiet Rivers by Northbound Static" })
    await waitFor(() => expect(firstRow).toHaveAccessibleDescription("Playing"))
    const fifthRow = screen.getByRole("row", { name: "Restless Rivers by Kite Theory" })

    await userEvent.dblClick(fifthRow)

    await waitFor(() => expect(fifthRow).toHaveAccessibleDescription("Playing"))
    expect(firstRow).toHaveAccessibleDescription("")
    expect(screen.getByRole("button", { name: "Pause Late Night Drive" })).toBeInTheDocument()
  })

  it("plays the focused track when Enter is pressed", async () => {
    await renderPlaylistPage("fake-playlist-late-night-drive")
    await screen.findByRole("table", { name: "Tracks" })
    const user = userEvent.setup()

    await tabToTracks(user)
    await user.keyboard("{ArrowDown}{Enter}")

    const secondRow = screen.getByRole("row", { name: "Electric Rivers by Lena Varga" })
    await waitFor(() => expect(secondRow).toHaveAccessibleDescription("Playing"))
  })

  // A play Spotify refuses, such as a list of tracks too long for it, must
  // not fail silently.
  it("says so when Spotify refuses to play a track", async () => {
    renderScreen(
      <StatusMessageProvider>
        <FakeMainView>
          <PlaylistPage playlistId="fake-playlist-late-night-drive" />
        </FakeMainView>
      </StatusMessageProvider>,
      fakeMainProcess(),
      spotifyApiFakeWith(() => ({
        startPlayback: () =>
          Effect.fail(new SpotifyResponseError({ status: 400, message: "Invalid request" })),
      })),
    )

    await userEvent.dblClick(
      await screen.findByRole("row", { name: "Restless Rivers by Kite Theory" }),
    )

    expect(await screen.findByText("Couldn't play this track.")).toBeInTheDocument()
  })

  it("starts the playlist from its play button, and pauses it from the same button", async () => {
    await renderPlaylistPage("fake-playlist-late-night-drive")

    await userEvent.click(await screen.findByRole("button", { name: "Play Late Night Drive" }))
    await userEvent.click(await screen.findByRole("button", { name: "Pause Late Night Drive" }))

    expect(await screen.findByRole("button", { name: "Play Late Night Drive" })).toBeInTheDocument()
    const firstRow = screen.getByRole("row", { name: "Quiet Rivers by Northbound Static" })
    expect(firstRow).toHaveAccessibleDescription("Playing")
  })

  // Tab must leave a long list after one row, not walk every link in it.
  it("puts only the tab stop row's artist and album links in the tab order", async () => {
    await renderPlaylistPage("fake-playlist-late-night-drive")
    const tracks = await screen.findByRole("table", { name: "Tracks" })
    const user = userEvent.setup()

    const firstRow = screen.getByRole("row", { name: "Quiet Rivers by Northbound Static" })

    await tabToTracks(user)
    await user.tab()
    expect(within(firstRow).getByRole("link", { name: "Northbound Static" })).toHaveFocus()
    await user.tab()
    expect(within(firstRow).getByRole("link", { name: "Glass Harbour" })).toHaveFocus()

    await user.tab()
    expect(tracks.contains(document.activeElement)).toBe(false)
  })

  // A local file's album has no Spotify id, so there is no page to open.
  it("shows a local file's album as text instead of a link", async () => {
    await renderPlaylistPage("fake-playlist-morning-coffee")
    const row = await screen.findByRole("row", { name: "Demo Take 3 by Mira Kaelin" })

    expect(row).toHaveTextContent("Voice Memos")
    expect(within(row).queryByRole("link")).toBeNull()
  })

  // Retry cannot bring back a session, so the page sends the user to log in.
  it("goes to the login screen, saying why, when the session has expired", async () => {
    const { router } = await renderPlaylistPage(
      "fake-playlist-late-night-drive",
      spotifyApiFakeWith(() => ({ getPlaylist: () => Effect.fail(new SessionExpired()) })),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })

  it("goes to the login screen when the user is not logged in", async () => {
    const { router } = await renderPlaylistPage(
      "fake-playlist-late-night-drive",
      spotifyApiFakeWith(() => ({ getPlaylist: () => Effect.fail(new NotLoggedIn()) })),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({})
  })

  it("explains that Spotify withholds the tracks of a playlist the user only follows", async () => {
    await renderPlaylistPage("fake-playlist-indie-finds")

    expect(await screen.findByRole("heading", { name: "Indie Finds" })).toBeInTheDocument()
    expect(screen.getByText(/only shares the tracks of playlists you own/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open in Spotify" })).toHaveAttribute(
      "href",
      "https://open.spotify.com/playlist/fake-playlist-indie-finds",
    )
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("shows an empty state for a playlist without tracks", async () => {
    await renderPlaylistPage("fake-playlist-ideas")

    expect(await screen.findByText(/This playlist is empty/)).toBeInTheDocument()
    expect(screen.getByText("Mira Kaelin · 0 tracks")).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("shows the playlist after Retry when loading it failed", async () => {
    await renderPlaylistPage("fake-playlist-late-night-drive", spotifyFailingFirstPlaylistRequest)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("This playlist didn't load.")
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("heading", { name: "Late Night Drive" })).toBeInTheDocument()
  })

  it("loads a page of tracks after Retry when loading it failed", async () => {
    const { mainView } = await renderPlaylistPage(
      "fake-playlist-late-night-drive",
      spotifyFailingFirstPageRequest,
    )
    await screen.findByRole("table", { name: "Tracks" })

    scrollMainViewToRow(mainView, 120)
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Some tracks didn't load.")
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("row", { name: "Quiet Echoes by Juniper Hollow" })).toBeVisible()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("clears the tracks error when the failed page loads after scrolling back to it", async () => {
    const { mainView } = await renderPlaylistPage(
      "fake-playlist-late-night-drive",
      spotifyFailingFirstPageRequest,
    )
    await screen.findByRole("table", { name: "Tracks" })
    scrollMainViewToRow(mainView, 120)
    await screen.findByRole("alert")

    scrollMainViewToRow(mainView, 0)
    await screen.findByRole("row", { name: "Quiet Rivers by Northbound Static" })
    scrollMainViewToRow(mainView, 120)

    expect(await screen.findByRole("row", { name: "Quiet Echoes by Juniper Hollow" })).toBeVisible()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
