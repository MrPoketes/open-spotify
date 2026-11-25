import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { failingFirstTime } from "../spotify/failing-first-time"
import type { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeLikedSongs } from "../spotify/spotify-fixtures"
import { FakeMainView } from "../track-list/fake-main-view"
import { scrollMainViewToRow } from "../track-list/fake-main-view-layout"
import { LikedSongsPage } from "./liked-songs-page"

// Serves the 5,000 fake liked songs and records the offset of every page
// requested, in order.
const spotifyRecordingPageRequests = () => {
  const requestedOffsets: Array<number> = []
  const spotifyApi = spotifyApiFakeWith((spotify) => ({
    getLikedSongsPage: (offset) =>
      Effect.sync(() => requestedOffsets.push(offset)).pipe(
        Effect.andThen(spotify.getLikedSongsPage(offset)),
      ),
  }))
  return { requestedOffsets, spotifyApi }
}

const renderLikedSongsPage = async (spotifyApi?: Layer.Layer<SpotifyApi>) => {
  await renderScreen(
    <FakeMainView>
      <LikedSongsPage />
    </FakeMainView>,
    fakeMainProcess(),
    spotifyApi,
  )
  return screen.findByRole("main")
}

const songNames = fakeLikedSongs.map(
  ({ track }) => `${track.name} by ${track.artists.map(({ name }) => name).join(", ")}`,
)

const songName = (index: number) => songNames[index] ?? `No liked song at ${index}`

// aria-rowindex counts from 1, and the column header is row 1.
const rowAt = (index: number) =>
  within(screen.getByRole("table", { name: "Liked Songs" }))
    .getAllByRole("row")
    .find((row) => row.getAttribute("aria-rowindex") === String(index + 2))

describe("LikedSongsPage", () => {
  it("shows the song count and the estimated total duration from the first page", async () => {
    await renderLikedSongsPage()

    expect(await screen.findByRole("heading", { name: "Liked Songs", level: 1 })).toBeVisible()
    expect(screen.getByText(/^5,000 songs · about \d+ hr( \d+ min)?$/)).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Liked Songs" })).toHaveAttribute(
      "aria-rowcount",
      "5001",
    )
  })

  // Only the songs that have loaded are sent, so a song's offset counts the
  // loaded songs before it, not its row: here the first page and the page
  // scrolled to.
  it("plays a double-clicked song from the loaded songs, past pages that never loaded", async () => {
    const mainView = await renderLikedSongsPage()
    await screen.findByRole("table", { name: "Liked Songs" })

    scrollMainViewToRow(mainView, 3000)
    const row = await screen.findByRole("row", { name: songName(3005) })
    await userEvent.dblClick(row)

    await waitFor(() => expect(row).toHaveAccessibleDescription("Playing"))
  })

  // Loading every page before the last would take a hundred requests.
  it("requests only the last page when End jumps to the end of the list", async () => {
    const { requestedOffsets, spotifyApi } = spotifyRecordingPageRequests()
    await renderLikedSongsPage(spotifyApi)
    await screen.findByRole("table", { name: "Liked Songs" })
    const user = userEvent.setup()

    await user.tab()
    await user.keyboard("{End}")

    expect(await screen.findByRole("row", { name: songName(4999) })).toHaveFocus()
    expect(requestedOffsets).toEqual([0, 4950])
  })

  it("requests each page once while the user scrolls back and forth", async () => {
    const { requestedOffsets, spotifyApi } = spotifyRecordingPageRequests()
    const mainView = await renderLikedSongsPage(spotifyApi)
    await screen.findByRole("table", { name: "Liked Songs" })

    // The second visit arrives while the first request is still on its way.
    scrollMainViewToRow(mainView, 2500)
    scrollMainViewToRow(mainView, 0)
    scrollMainViewToRow(mainView, 2500)
    await waitFor(() => expect(rowAt(2500)).toHaveAccessibleName(songName(2500)))
    // The third arrives after the page has loaded.
    scrollMainViewToRow(mainView, 0)
    await waitFor(() => expect(rowAt(0)).toHaveAccessibleName(songName(0)))
    scrollMainViewToRow(mainView, 2500)
    await waitFor(() => expect(rowAt(2500)).toHaveAccessibleName(songName(2500)))

    expect(requestedOffsets).toContain(2500)
    expect(requestedOffsets).toEqual([...new Set(requestedOffsets)])
  })

  it("says where songs will appear when the user has liked none", async () => {
    await renderLikedSongsPage(
      spotifyApiFakeWith(() => ({
        getLikedSongsPage: () => Effect.succeed({ items: [], next: null, total: 0 }),
      })),
    )

    expect(await screen.findByText("Songs you like will appear here.")).toBeVisible()
    expect(screen.getByText("0 songs")).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("shows the songs after Retry when the first page failed to load", async () => {
    await renderLikedSongsPage(
      spotifyApiFakeWith((spotify) => {
        const failFirst = failingFirstTime()
        return { getLikedSongsPage: (offset) => failFirst(spotify.getLikedSongsPage(offset)) }
      }),
    )

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Liked Songs didn't load.")
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("row", { name: songName(0) })).toBeVisible()
  })
})
