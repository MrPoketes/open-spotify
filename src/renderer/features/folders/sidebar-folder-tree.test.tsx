import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { FolderTree } from "../../../shared/folders"
import { ipcChannels } from "../../../shared/ipc-channels"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
import { renderScreen } from "../../lib/render-screen"
import { FoldersProvider } from "./folders-provider"
import { SidebarFolderTree } from "./sidebar-folder-tree"

const runningId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e01"
const warmUpId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e02"

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
      { _tag: "Folder", id: warmUpId, name: "Warm-up", entries: [] },
    ],
  },
]

const sidebarFolderTree = (
  <FoldersProvider>
    <SidebarFolderTree />
  </FoldersProvider>
)

const treeItem = (name: string) => screen.findByRole("treeitem", { name: new RegExp(`^${name}`) })

describe("SidebarFolderTree", () => {
  it("opens an entry's page when it is activated", async () => {
    const router = renderScreen(sidebarFolderTree, fakeMainProcess({ folderTree }))
    const running = await treeItem("Running")
    act(() => running.focus())

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
    const running = await treeItem("Running")
    act(() => running.focus())
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

  it("shows nothing for a user without folders", async () => {
    renderScreen(sidebarFolderTree, fakeMainProcess())

    // The tree loads from the main process, so give it the chance to appear.
    await act(() => Promise.resolve())

    expect(screen.queryByRole("tree")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Folders" })).not.toBeInTheDocument()
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
