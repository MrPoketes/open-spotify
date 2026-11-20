import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { FakeMainView } from "../track-list/fake-main-view"
import { TrackList } from "../track-list/track-list"
import type { TrackListEntry } from "../track-list/track-row"

const trackWithTwoArtists: TrackListEntry = {
  trackId: "fake-track-0",
  title: "Harbour Lights",
  artists: [
    { id: "fake-artist-0", name: "Northbound Static" },
    { id: "fake-artist-1", name: "Lena Varga" },
  ],
  album: { id: "fake-album-0", name: "Glass Harbour" },
  artwork: [],
  addedAt: null,
  durationMs: 200_000,
}

const localFile: TrackListEntry = {
  trackId: null,
  title: "Voice memo",
  artists: [{ id: null, name: "Mira Kaelin" }],
  album: { id: null, name: "Recordings" },
  artwork: [],
  addedAt: null,
  durationMs: 60_000,
}

const entries = [trackWithTwoArtists, localFile]

const renderTracks = async () => {
  const user = userEvent.setup()
  const router = renderScreen(
    <StatusMessageProvider>
      <FakeMainView>
        <TrackList
          label="Tracks"
          layout="playlist"
          trackCount={entries.length}
          trackAt={(index) => entries[index]}
        />
      </FakeMainView>
    </StatusMessageProvider>,
    fakeMainProcess(),
  )
  const row = await screen.findByRole("row", {
    name: "Harbour Lights by Northbound Static, Lena Varga",
  })
  return { user, router, row }
}

describe("TrackContextMenu", () => {
  it("goes to the track's album from the menu of the focused row", async () => {
    const { user, router, row } = await renderTracks()
    row.focus()

    await user.keyboard("{Shift>}{F10}{/Shift}")
    expect(screen.getByRole("menu", { name: "Actions for Harbour Lights" })).toBeInTheDocument()
    await user.keyboard("{ArrowDown}{Enter}")

    await waitFor(() => expect(router.state.location.pathname).toBe("/album/fake-album-0"))
  })

  it("lists each artist of a track with several artists under Go to artist", async () => {
    const { user, router, row } = await renderTracks()

    await user.pointer({ keys: "[MouseRight]", target: row })
    await user.click(screen.getByRole("menuitem", { name: "Go to artist" }))
    await user.click(screen.getByRole("menuitem", { name: "Lena Varga" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/artist/fake-artist-1"))
  })

  it("copies the track's Spotify link and says so", async () => {
    const { user, row } = await renderTracks()

    await user.pointer({ keys: "[MouseRight]", target: row })
    await user.click(screen.getByRole("menuitem", { name: "Copy link" }))

    expect(await screen.findByRole("status")).toHaveTextContent("Link copied")
    expect(await navigator.clipboard.readText()).toBe("https://open.spotify.com/track/fake-track-0")
  })

  // A local file has no Spotify link, album page, or artist page, so every
  // action would lead nowhere.
  it("opens no menu for a local file", async () => {
    const { user } = await renderTracks()

    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByRole("row", { name: "Voice memo by Mira Kaelin" }),
    })

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
