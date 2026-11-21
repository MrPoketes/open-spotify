import { act, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import type { DesktopApi } from "../../../preload/desktop-api"
import type { FolderTree } from "../../../shared/folders"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { FoldersProvider } from "./folders-provider"
import { SidebarFolderTree } from "./sidebar-folder-tree"

// The sidebar folder tree over a fake main process, shared by the tests that
// rearrange it from the keyboard, the menu, and the mouse.
const runningId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d01"
export const warmUpId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d02"
const stretchId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d03"
export const focusId = "8a2d4c6e-1b3f-4d5a-9c7e-0f1a2b3c4d04"

// Running holds Easy Start and Warm-up, which holds Stretch. Focus is empty.
export const folderTree: FolderTree = [
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

export const renderTree = (mainProcess: DesktopApi = fakeMainProcess({ folderTree })) =>
  renderScreen(
    <StatusMessageProvider>
      <FoldersProvider>
        <SidebarFolderTree />
      </FoldersProvider>
    </StatusMessageProvider>,
    mainProcess,
  )

export const treeItem = (name: string) =>
  screen.findByRole("treeitem", { name: new RegExp(`^${name}`) })

export const focusTreeItem = async (name: string) => {
  const item = await treeItem(name)
  act(() => item.focus())
}

export const expandRunning = async () => {
  await focusTreeItem("Running")
  await userEvent.keyboard("{ArrowRight}")
}
