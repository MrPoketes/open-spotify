import { act, screen, waitFor } from "@testing-library/react"
import { Stream } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import type { FolderTree } from "../../../shared/folders"
import { dragOverTreeItem, layOutTreeRows } from "../../lib/drag-tree-item"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { findStatusMessage } from "../../lib/find-status-message"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { FoldersProvider } from "../folders/folders-provider"
import { lowOrbit } from "../folders/low-orbit-album"
import {
  dropPositionOn,
  expandRunning,
  focusId,
  folderTree,
  treeItem,
} from "../folders/sidebar-folder-tree-screen"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { Sidebar } from "./sidebar"

const renderSidebar = (tree: FolderTree = folderTree) =>
  renderScreen(
    <StatusMessageProvider>
      <FoldersProvider>
        <Sidebar savedWidth={280} />
      </FoldersProvider>
    </StatusMessageProvider>,
    fakeMainProcess({ folderTree: tree }),
    spotifyApiFakeWith(() => ({ savedAlbums: Stream.make(lowOrbit) })),
  )

// Folder tree rows are tree items, so the only links named this way are the
// library's.
const libraryRow = (name: string) => screen.findByRole("link", { name: new RegExp(`^${name}`) })

const treeWithLowOrbitInFocus: FolderTree = folderTree.map((folder) =>
  folder.id === focusId
    ? {
        ...folder,
        entries: [
          { _tag: "SpotifyItem", uri: lowOrbit.album.uri, name: "Low Orbit", imageUrl: null },
        ],
      }
    : folder,
)

const nothingAdded = async () => {
  await act(() => Promise.resolve())
  expect(screen.queryByText(/^Added to/)).not.toBeInTheDocument()
}

describe("Dragging library entries onto folders", () => {
  beforeEach(() => {
    const layout = layOutTreeRows()
    return () => layout.mockRestore()
  })

  it("highlights the folder a library entry would go into, then adds the entry last", async () => {
    await renderSidebar()

    const drag = await dragOverTreeItem(
      await libraryRow("Low Orbit"),
      await treeItem("Running"),
      0.5,
    )
    expect(await dropPositionOn("Running")).toBe("inside")
    await drag.release()

    expect(await findStatusMessage("Added to Running")).toBeInTheDocument()
    await expandRunning()
    expect(await treeItem("Low Orbit")).toHaveAttribute("aria-posinset", "3")
  })

  it("refuses a library entry on a folder that already holds it, and shows no drop indicator", async () => {
    await renderSidebar(treeWithLowOrbitInFocus)

    const drag = await dragOverTreeItem(await libraryRow("Low Orbit"), await treeItem("Focus"), 0.5)
    expect(await dropPositionOn("Focus")).toBeNull()
    await drag.release()

    await nothingAdded()
  })

  // Library entries go only inside folders, and the tree's lines between rows
  // are places among a folder's entries.
  it("refuses a library entry dropped between folders, and shows no drop indicator", async () => {
    await renderSidebar()

    const drag = await dragOverTreeItem(await libraryRow("Low Orbit"), await treeItem("Focus"), 0.1)
    expect(await dropPositionOn("Focus")).toBeNull()
    await drag.release()

    await nothingAdded()
  })

  // Liked Songs is not an item Spotify can link to, so no folder can hold it,
  // and a press on it that moves stays a click on its link.
  it("starts no drag from Liked Songs", async () => {
    const router = await renderSidebar()

    const drag = await dragOverTreeItem(
      await libraryRow("Liked Songs"),
      await treeItem("Running"),
      0.5,
    )
    expect(await dropPositionOn("Running")).toBeNull()
    await drag.release()

    await waitFor(() => expect(router.state.location.pathname).toBe("/collection/tracks"))
  })
})
