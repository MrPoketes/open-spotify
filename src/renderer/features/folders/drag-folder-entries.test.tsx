import { act, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import type { FolderTree } from "../../../shared/folders"
import { dragOntoTreeItem, dragOverTreeItem, layOutTreeRows } from "../../lib/drag-tree-item"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { findStatusMessage } from "../../lib/find-status-message"
import {
  dropPositionOn,
  expandRunning,
  focusId,
  focusTreeItem,
  folderTree,
  renderTree,
  treeItem,
} from "./sidebar-folder-tree-screen"

const sleepId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d05"

const playlist = (name: string, id: string) =>
  ({ _tag: "SpotifyItem", uri: `spotify:playlist:${id}`, name, imageUrl: null }) as const

// Focus holds a copy of Easy Start, cached before the playlist was renamed
// from Morning Start.
const treeWithCopyInFocus: FolderTree = folderTree.map((folder) =>
  folder.id === focusId
    ? {
        ...folder,
        entries: [
          playlist("Morning Start", "37i9dQZF1DX76Wlfdnj7AP"),
          playlist("Calm", "37i9dQZF1DWZeKCadgRdKQ"),
          playlist("Deep Work", "37i9dQZF1DX4sWSpwq3LiO"),
        ],
      }
    : folder,
)

describe("Dragging folder entries", () => {
  beforeEach(layOutTreeRows)

  it("reorders a folder dropped on the line above another one", async () => {
    await renderTree()

    await dragOntoTreeItem(await treeItem("Focus"), await treeItem("Running"), 0.1)

    expect(await findStatusMessage("Moved Focus up")).toBeInTheDocument()
    expect(await treeItem("Focus")).toHaveAttribute("aria-posinset", "1")
    expect(await treeItem("Running")).toHaveAttribute("aria-posinset", "2")
  })

  // The main process counts the position without the moved entry, so a move
  // down lands one place above the line it was dropped on.
  it("reorders a folder dropped on the line below a sibling further down", async () => {
    const withSleep = [
      ...folderTree,
      { _tag: "Folder" as const, id: sleepId, name: "Sleep", entries: [] },
    ]
    await renderTree(fakeMainProcess({ folderTree: withSleep }))

    await dragOntoTreeItem(await treeItem("Running"), await treeItem("Focus"), 0.9)

    expect(await findStatusMessage("Moved Running down")).toBeInTheDocument()
    expect(await treeItem("Running")).toHaveAttribute("aria-posinset", "2")
    expect(await treeItem("Sleep")).toHaveAttribute("aria-posinset", "3")
  })

  it("moves a nested folder dropped beside a top-level folder to the top level", async () => {
    await renderTree()
    await expandRunning()

    await dragOntoTreeItem(await treeItem("Warm-up"), await treeItem("Focus"), 0.9)

    expect(await findStatusMessage("Moved Warm-up to the top level")).toBeInTheDocument()
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-level", "1")
  })

  it("refuses a drop that would leave the entry where it is, and shows no drop indicator", async () => {
    await renderTree()

    const drag = await dragOverTreeItem(await treeItem("Focus"), await treeItem("Running"), 0.9)
    expect(await dropPositionOn("Running")).toBeNull()
    await drag.release()

    await act(() => Promise.resolve())
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  // Pressing in the field and moving the mouse selects text.
  it("starts no drag from a folder's rename field", async () => {
    await renderTree()
    await focusTreeItem("Focus")
    await userEvent.keyboard("{F2}")

    const nameField = screen.getByRole("textbox", { name: "Folder name" })
    await dragOverTreeItem(nameField, await treeItem("Running"), 0.5)

    expect(await dropPositionOn("Running")).toBeNull()
  })

  // The menu is drawn outside the row, but React still hands the row its presses.
  it("starts no drag from a row's context menu", async () => {
    await renderTree()
    await userEvent.pointer({ keys: "[MouseRight]", target: await treeItem("Focus") })

    const renameItem = await screen.findByRole("menuitem", { name: "Rename" })
    await dragOverTreeItem(renameItem, await treeItem("Running"), 0.5)

    expect(await dropPositionOn("Running")).toBeNull()
  })

  // The rows below a folder that opens move down, the dragged row with them,
  // while the pointer stays on the folder.
  it("drops inside a folder that opened above the dragged row", async () => {
    await renderTree()

    const drag = await dragOverTreeItem(await treeItem("Focus"), await treeItem("Running"), 0.5)
    await treeItem("Easy Start")
    await drag.moveOver(await treeItem("Running"), 0.5)
    await drag.release()

    expect(await findStatusMessage("Moved Focus to Running")).toBeInTheDocument()
  })

  // A folder keeps one copy of each item, so the copy already in the target
  // folder goes, and the moved item takes the place it was dropped on.
  it("puts a Spotify item where it was dropped in a folder that held a copy of it", async () => {
    await renderTree(fakeMainProcess({ folderTree: treeWithCopyInFocus }))
    await expandRunning()
    await focusTreeItem("Focus")
    await userEvent.keyboard("{ArrowRight}")

    await dragOntoTreeItem(await treeItem("Easy Start"), await treeItem("Deep Work"), 0.1)

    expect(await findStatusMessage("Moved Easy Start to Focus")).toBeInTheDocument()
    expect(screen.queryByRole("treeitem", { name: /^Morning Start/ })).not.toBeInTheDocument()
    expect(await treeItem("Easy Start")).toHaveAttribute("aria-posinset", "2")
    expect(await treeItem("Deep Work")).toHaveAttribute("aria-posinset", "3")
  })

  it("highlights the folder a dragged entry would go into, then moves the entry into it", async () => {
    await renderTree()
    await expandRunning()

    const drag = await dragOverTreeItem(await treeItem("Easy Start"), await treeItem("Focus"), 0.5)
    expect(await dropPositionOn("Focus")).toBe("inside")
    await drag.release()

    expect(await findStatusMessage("Moved Easy Start to Focus")).toBeInTheDocument()
    expect(screen.queryByRole("treeitem", { name: /^Easy Start/ })).not.toBeInTheDocument()
  })

  it("refuses to drop a folder into a folder inside it, and shows no drop indicator", async () => {
    await renderTree()
    await expandRunning()
    await focusTreeItem("Warm-up")
    await userEvent.keyboard("{ArrowRight}")

    const drag = await dragOverTreeItem(await treeItem("Warm-up"), await treeItem("Stretch"), 0.5)
    expect(await dropPositionOn("Stretch")).toBeNull()
    await drag.release()

    await act(() => Promise.resolve())
    expect(await treeItem("Stretch")).toHaveAttribute("aria-level", "3")
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  // Spotify items live only inside folders.
  it("refuses to drop a Spotify item on the top level, and shows no drop indicator", async () => {
    await renderTree()
    await expandRunning()

    const drag = await dragOverTreeItem(
      await treeItem("Easy Start"),
      await treeItem("Running"),
      0.1,
    )
    expect(await dropPositionOn("Running")).toBeNull()
    await drag.release()

    await act(() => Promise.resolve())
    expect(await treeItem("Easy Start")).toHaveAttribute("aria-level", "2")
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })
})
