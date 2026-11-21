import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Profiler } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { setWindowVisibility } from "../../lib/fake-window-visibility"
import { useFolderTree } from "../folders/folder-tree"
import { useEditablePlaylists } from "../track-actions/editable-playlists"
import { FakeMainView } from "../track-list/fake-main-view"
import { TrackList } from "../track-list/track-list"
import type { TrackListEntry } from "../track-list/track-row"
import { openQueue, renderAppShell } from "./render-app-shell"

const harbourLights: TrackListEntry = {
  trackId: "fake-track-0",
  title: "Harbour Lights",
  artists: [{ id: "fake-artist-0", name: "Northbound Static" }],
  album: { id: "fake-album-0", name: "Glass Harbour" },
  artwork: [],
  addedAt: null,
  durationMs: 200_000,
}

// Track rows read the folder tree and the editable playlists, which load
// after the page mounts and re-render it when they arrive.
function TrackMenuLoadStatus() {
  const folderTree = useFolderTree()
  const editablePlaylists = useEditablePlaylists()
  return (
    <p>
      Folders {folderTree.state.status}, editable playlists {editablePlaylists.state.status}
    </p>
  )
}

afterEach(() => setWindowVisibility("visible"))

describe("AppShell", () => {
  // Every row of an open page reads the contexts the app shell provides, so a
  // context value made anew on each render of the shell re-renders them all.
  it("does not re-render the open page when the queue or the device picker opens or closes", async () => {
    // Each poll of the player re-renders every track list. While the window
    // is hidden, the player waits 15 seconds before its first poll.
    setWindowVisibility("hidden")
    let pageRenders = 0
    await renderAppShell({
      albumPageContent: (
        <Profiler id="album page" onRender={() => (pageRenders += 1)}>
          <TrackMenuLoadStatus />
          <FakeMainView>
            <TrackList
              label="Tracks"
              layout="album"
              trackCount={1}
              trackAt={() => harbourLights}
              playbackStartAt={(index) => ({ uris: [], offset: { position: index } })}
            />
          </FakeMainView>
        </Profiler>
      ),
    })
    await screen.findByRole("row", { name: "Harbour Lights by Northbound Static" })
    await screen.findByText("Folders loaded, editable playlists loaded")
    pageRenders = 0

    await openQueue()
    await userEvent.click(await screen.findByRole("button", { name: "Close queue" }))
    await userEvent.click(screen.getByRole("button", { name: "Choose a device. Devices" }))
    await screen.findByRole("dialog", { name: "Connect to a device" })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    expect(pageRenders).toBe(0)
  })
})
