import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it, onTestFinished } from "vitest"
import type { FolderTree } from "../../../shared/folders"
import { ipcChannels } from "../../../shared/ipc-channels"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { FoldersProvider } from "./folders-provider"
import { SidebarFolderTree } from "./sidebar-folder-tree"

const runningId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e01"
const warmUpId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e02"
const focusId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e03"

// Running holds three items, one of them inside Warm-up.
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
        imageUrl: "https://i.scdn.co/image/easy-start",
      },
      {
        _tag: "Folder",
        id: warmUpId,
        name: "Warm-up",
        entries: [
          {
            _tag: "SpotifyItem",
            uri: "spotify:album:2noRn2Aes5aoNVsU6iWThc",
            name: "Low Orbit",
            imageUrl: null,
          },
        ],
      },
    ],
  },
  { _tag: "Folder", id: focusId, name: "Focus", entries: [] },
]

const sidebarFolderTree = (
  <StatusMessageProvider>
    <FoldersProvider>
      <SidebarFolderTree />
    </FoldersProvider>
  </StatusMessageProvider>
)

const treeItem = (name: string) => screen.findByRole("treeitem", { name: new RegExp(`^${name}`) })

const focusTreeItem = async (name: string) => {
  const item = await treeItem(name)
  act(() => item.focus())
}

const renameField = () => screen.findByRole("textbox", { name: "Folder name" })

describe("SidebarFolderTree", () => {
  it("opens an entry's page when it is activated", async () => {
    const router = renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Running")

    await userEvent.keyboard("{ArrowRight}{ArrowDown}{Enter}")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/playlist/37i9dQZF1DX76Wlfdnj7AP"),
    )
  })

  it("opens a folder's page when it is clicked", async () => {
    const router = renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))

    await userEvent.click(await treeItem("Running"))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/folder/${runningId}`))
  })

  it("keeps the folders the user expanded open, and the ones they collapsed closed, after a restart", async () => {
    const mainProcess = fakeMainProcess({ folderTree })
    renderScreen(sidebarFolderTree, mainProcess)
    await focusTreeItem("Running")
    // Expands Running, moves down to Warm-up, then expands and collapses it.
    await userEvent.keyboard("{ArrowRight}{ArrowDown}{ArrowDown}{ArrowRight}")
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{ArrowLeft}")
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-expanded", "false")
    cleanup()

    renderScreen(sidebarFolderTree, mainProcess)

    expect(await treeItem("Running")).toHaveAttribute("aria-expanded", "true")
    expect(await treeItem("Warm-up")).toHaveAttribute("aria-expanded", "false")
  })

  it("lets a user without folders create one and name it straight away", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess())

    await userEvent.click(await screen.findByRole("button", { name: "New folder" }))
    const field = await renameField()
    expect(field).toHaveFocus()
    expect(field).toHaveValue("New folder")
    await userEvent.keyboard("Cycling{Enter}")

    expect(await treeItem("Cycling")).toHaveFocus()
  })

  it("creates a folder inside a folder from its context menu", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Focus")

    await userEvent.keyboard("{Shift>}{F10}{/Shift}")
    await userEvent.click(screen.getByRole("menuitem", { name: "New folder" }))
    await renameField()
    await userEvent.keyboard("Deep work{Enter}")

    expect(await treeItem("Focus")).toHaveAttribute("aria-expanded", "true")
    expect(await treeItem("Deep work")).toHaveAttribute("aria-level", "2")
  })

  it("renames a folder with F2", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Running")

    await userEvent.keyboard("{F2}")
    await userEvent.clear(await renameField())
    await userEvent.keyboard("Long runs{Enter}")

    expect(await treeItem("Long runs")).toHaveFocus()
    expect(screen.queryByRole("treeitem", { name: /^Running/ })).not.toBeInTheDocument()
  })

  it("renames a folder from its context menu", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))

    await userEvent.pointer({ keys: "[MouseRight]", target: await treeItem("Focus") })
    await userEvent.click(screen.getByRole("menuitem", { name: "Rename" }))
    await userEvent.clear(await renameField())
    await userEvent.keyboard("Deep focus{Enter}")

    expect(await treeItem("Deep focus")).toHaveFocus()
  })

  it("saves a rename when the user leaves the field, and leaves focus where they moved it", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Running")

    await userEvent.keyboard("{F2}")
    await userEvent.clear(await renameField())
    await userEvent.keyboard("Long runs")
    await userEvent.tab({ shift: true })

    expect(await treeItem("Long runs")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "New folder" })).toHaveFocus()
  })

  // A click on the row's icon or padding focuses the row being renamed, which
  // the end of the rename replaces, so focus must land on the row that follows.
  it("saves a rename and focuses the folder's row when the user clicks that row outside the field", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Running")

    await userEvent.keyboard("{F2}")
    await userEvent.clear(await renameField())
    await userEvent.keyboard("Long runs")
    await userEvent.click(await treeItem("Running"))

    expect(await treeItem("Long runs")).toHaveFocus()
  })

  // App-wide shortcuts, such as Alt+Left to go back, listen on the window and
  // must still work while a folder name is edited.
  it("leaves keys held with Ctrl, Alt, or Cmd in the rename field to app-wide shortcuts", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Running")
    await userEvent.keyboard("{F2}")
    await renameField()
    const keysHeardByWindow: Array<string> = []
    const hearKey = (event: KeyboardEvent) => keysHeardByWindow.push(event.key)
    window.addEventListener("keydown", hearKey)
    onTestFinished(() => window.removeEventListener("keydown", hearKey))

    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}{Control>}k{/Control}")

    expect(keysHeardByWindow).toEqual(expect.arrayContaining(["ArrowLeft", "k"]))
    expect(await renameField()).toHaveFocus()
  })

  it("refuses a blank name, and keeps the old one when the rename is cancelled", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Running")

    await userEvent.keyboard("{F2}")
    await userEvent.clear(await renameField())
    await userEvent.keyboard("   {Enter}")

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a name for the folder.")
    expect(await renameField()).toHaveAccessibleDescription("Enter a name for the folder.")
    await userEvent.keyboard("{Escape}")
    expect(await treeItem("Running")).toHaveFocus()
  })

  it("deletes a folder after saying how many items go with it, and focuses the next row", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    await focusTreeItem("Running")

    await userEvent.keyboard("{Shift>}{F10}{/Shift}")
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete…" }))
    const dialog = screen.getByRole("dialog", { name: "Delete Running?" })
    expect(dialog).toHaveTextContent("the 3 items in it")
    await userEvent.click(screen.getByRole("button", { name: "Delete folder" }))

    await waitFor(() =>
      expect(screen.queryByRole("treeitem", { name: /^Running/ })).not.toBeInTheDocument(),
    )
    expect(await treeItem("Focus")).toHaveFocus()
  })

  it("moves focus to the New folder button when the last folder is deleted", async () => {
    renderScreen(
      sidebarFolderTree,
      fakeMainProcess({
        folderTree: [{ _tag: "Folder", id: focusId, name: "Focus", entries: [] }],
      }),
    )
    await focusTreeItem("Focus")

    await userEvent.keyboard("{Shift>}{F10}{/Shift}")
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete…" }))
    expect(screen.getByRole("dialog", { name: "Delete Focus?" })).toHaveTextContent("empty")
    await userEvent.click(screen.getByRole("button", { name: "Delete folder" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "New folder" })).toHaveFocus())
    expect(screen.queryByRole("tree")).not.toBeInTheDocument()
  })

  it("reloads the folders and says so when a folder was deleted elsewhere", async () => {
    const mainProcess = fakeMainProcess({ folderTree })
    renderScreen(sidebarFolderTree, mainProcess)
    await focusTreeItem("Running")
    // Another window deletes Running while this one still shows it.
    await mainProcess.invoke(ipcChannels.deleteFolder, { folderId: runningId })

    await userEvent.keyboard("{F2}")
    await userEvent.keyboard("Long runs{Enter}")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "That folder no longer exists, so your folders were reloaded.",
    )
    expect(screen.queryByRole("treeitem", { name: /^Running/ })).not.toBeInTheDocument()
  })

  it("says so and offers a retry when the folders fail to load", async () => {
    renderScreen(
      sidebarFolderTree,
      mainProcessFailingOn(ipcChannels.getFolderTree, fakeMainProcess({ folderTree })),
    )

    expect(await screen.findByRole("alert")).toHaveTextContent("Your folders didn't load.")
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })
})
