import { act, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { findStatusMessage } from "../../lib/find-status-message"
import {
  expandRunning,
  focusId,
  focusTreeItem,
  folderTree,
  renderTree,
  treeItem,
  warmUpId,
} from "./sidebar-folder-tree-screen"

// Opens the Move to folder submenu of a tree item's context menu.
const openMoveSubmenu = async (name: string) => {
  await userEvent.pointer({ keys: "[MouseRight]", target: await treeItem(name) })
  await userEvent.click(await screen.findByRole("menuitem", { name: "Move to folder" }))
  return screen.getByRole("menu", { name: "Move to folder" })
}

// Refuses every folder move, as the real main process does when the tree it
// holds has changed since the renderer last read it.
const mainProcessRefusingFolderMoves = (): DesktopApi => {
  const workingMainProcess = fakeMainProcess({ folderTree })
  return {
    invoke: (channel, request) =>
      channel === ipcChannels.moveFolder
        ? Promise.resolve({
            _tag: "IpcFailed",
            error: {
              _tag: "FolderMovedIntoOwnSubtree",
              folderId: warmUpId,
              parentFolderId: focusId,
            },
          })
        : workingMainProcess.invoke(channel, request),
  }
}

describe("Moving folder entries", () => {
  it("moves the focused entry down among its siblings with Alt+Down and keeps focus on it", async () => {
    await renderTree()
    await focusTreeItem("Running")

    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}")

    await waitFor(async () =>
      expect(await treeItem("Running")).toHaveAttribute("aria-posinset", "2"),
    )
    expect(await treeItem("Focus")).toHaveAttribute("aria-posinset", "1")
    expect(await treeItem("Running")).toHaveFocus()
    expect(await treeItem("Running")).toHaveAttribute("tabindex", "0")
  })

  it("moves a focused Spotify item down within its folder with Alt+Down", async () => {
    await renderTree()
    await expandRunning()
    await focusTreeItem("Easy Start")

    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}")

    await waitFor(async () =>
      expect(await treeItem("Easy Start")).toHaveAttribute("aria-posinset", "2"),
    )
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-posinset", "1")
    expect(await treeItem("Easy Start")).toHaveFocus()
  })

  // A step past the first entry has no position to land at, so it must not
  // reach the main process and come back as a "Couldn't move" error.
  it("leaves the first and last entries in place, and says nothing, when moved past the end", async () => {
    await renderTree()

    await focusTreeItem("Running")
    await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}")
    await focusTreeItem("Focus")
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}")

    await act(() => Promise.resolve())
    expect(await treeItem("Running")).toHaveAttribute("aria-posinset", "1")
    expect(await treeItem("Focus")).toHaveAttribute("aria-posinset", "2")
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("offers to move a folder to the top level and into folders outside it, never into itself or its descendants", async () => {
    await renderTree()
    await expandRunning()

    const moveSubmenu = await openMoveSubmenu("Warm-up")

    const targets = within(moveSubmenu).getAllByRole("menuitem")
    expect(targets.map((target) => target.textContent)).toEqual(["Top level", "Focus"])
  })

  it("moves an entry into the folder chosen from its context menu", async () => {
    await renderTree()
    await expandRunning()

    const moveSubmenu = await openMoveSubmenu("Easy Start")
    await userEvent.click(within(moveSubmenu).getByRole("menuitem", { name: "Focus" }))

    await waitFor(() =>
      expect(screen.queryByRole("treeitem", { name: /^Easy Start/ })).not.toBeInTheDocument(),
    )
    await focusTreeItem("Focus")
    await userEvent.keyboard("{ArrowRight}")
    expect(await treeItem("Easy Start")).toHaveAttribute("aria-level", "2")
  })

  it("moves a folder to the end of the top level", async () => {
    await renderTree()
    await expandRunning()

    const moveSubmenu = await openMoveSubmenu("Warm-up")
    await userEvent.click(within(moveSubmenu).getByRole("menuitem", { name: "Top level" }))

    await waitFor(async () => expect(await treeItem("Warm-up")).toHaveAttribute("aria-level", "1"))
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-posinset", "3")
  })

  it("moves a folder, with what is inside it, into another folder", async () => {
    await renderTree()
    await expandRunning()

    const moveSubmenu = await openMoveSubmenu("Warm-up")
    await userEvent.click(within(moveSubmenu).getByRole("menuitem", { name: "Focus" }))

    await waitFor(() =>
      expect(screen.queryByRole("treeitem", { name: /^Warm-up/ })).not.toBeInTheDocument(),
    )
    await focusTreeItem("Focus")
    await userEvent.keyboard("{ArrowRight}{ArrowDown}{ArrowRight}")
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-level", "2")
    expect(await treeItem("Stretch")).toHaveAttribute("aria-level", "3")
  })

  it("leaves the tree as it was and says why when the main process refuses a move", async () => {
    await renderTree(mainProcessRefusingFolderMoves())
    await expandRunning()

    const moveSubmenu = await openMoveSubmenu("Warm-up")
    await userEvent.click(within(moveSubmenu).getByRole("menuitem", { name: "Focus" }))

    expect(
      await findStatusMessage("Couldn't move Warm-up. A folder can't go inside itself."),
    ).toBeInTheDocument()
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-level", "2")
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-posinset", "2")
  })
})
