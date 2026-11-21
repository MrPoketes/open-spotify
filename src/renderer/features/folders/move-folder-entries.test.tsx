import { act, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import type { FolderTree } from "../../../shared/folders"
import { ipcChannels } from "../../../shared/ipc-channels"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { FoldersProvider } from "./folders-provider"
import { SidebarFolderTree } from "./sidebar-folder-tree"

const runningId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d01"
const warmUpId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d02"
const stretchId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d03"
const focusId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d04"

// Running holds Easy Start and Warm-up, which holds Stretch. Focus is empty.
const folderTree: FolderTree = [
  {
    _tag: "Folder",
    id: runningId,
    name: "Running",
    entries: [
      {
        _tag: "SpotifyItem",
        uri: "spotify:playlist:37i9dQZF1DX76Wlfdnj7AP",
        name: "Easy Start",
        imageUrl: null,
      },
      {
        _tag: "Folder",
        id: warmUpId,
        name: "Warm-up",
        entries: [{ _tag: "Folder", id: stretchId, name: "Stretch", entries: [] }],
      },
    ],
  },
  { _tag: "Folder", id: focusId, name: "Focus", entries: [] },
]

const renderTree = (mainProcess: DesktopApi = fakeMainProcess({ folderTree })) =>
  renderScreen(
    <StatusMessageProvider>
      <FoldersProvider>
        <SidebarFolderTree />
      </FoldersProvider>
    </StatusMessageProvider>,
    mainProcess,
  )

const treeItem = (name: string) => screen.findByRole("treeitem", { name: new RegExp(`^${name}`) })

const focusTreeItem = async (name: string) => {
  const item = await treeItem(name)
  act(() => item.focus())
}

const expandRunning = async () => {
  await focusTreeItem("Running")
  await userEvent.keyboard("{ArrowRight}")
}

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
    renderTree()
    await focusTreeItem("Running")

    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}")

    await waitFor(async () =>
      expect(await treeItem("Running")).toHaveAttribute("aria-posinset", "2"),
    )
    expect(await treeItem("Focus")).toHaveAttribute("aria-posinset", "1")
    expect(await treeItem("Running")).toHaveFocus()
    expect(await treeItem("Running")).toHaveAttribute("tabindex", "0")
  })

  it("moves the focused item up within its folder with Alt+Up", async () => {
    renderTree()
    await expandRunning()
    await focusTreeItem("Warm-up")

    await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}")

    await waitFor(async () =>
      expect(await treeItem("Easy Start")).toHaveAttribute("aria-posinset", "2"),
    )
    expect(await treeItem("Warm-up")).toHaveFocus()
  })

  it("offers to move a folder to the top level and into folders outside it, never into itself or its descendants", async () => {
    renderTree()
    await expandRunning()

    const moveSubmenu = await openMoveSubmenu("Warm-up")

    const targets = within(moveSubmenu).getAllByRole("menuitem")
    expect(targets.map((target) => target.textContent)).toEqual(["Top level", "Focus"])
  })

  it("moves an entry into the folder chosen from its context menu", async () => {
    renderTree()
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

  it("leaves the tree as it was and says why when the main process refuses a move", async () => {
    renderTree(mainProcessRefusingFolderMoves())
    await expandRunning()

    const moveSubmenu = await openMoveSubmenu("Warm-up")
    await userEvent.click(within(moveSubmenu).getByRole("menuitem", { name: "Focus" }))

    expect(
      await screen.findByText("Couldn't move Warm-up. A folder can't go inside itself.", {
        selector: "output > p",
      }),
    ).toBeInTheDocument()
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-level", "2")
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-posinset", "2")
  })
})
