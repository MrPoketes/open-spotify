import { screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { FoldersProvider } from "../folders/folders-provider"
import { Sidebar } from "./sidebar"

const mainProcessReplying = (replies: Partial<Record<string, unknown>>): DesktopApi => ({
  invoke: (channel) => Promise.resolve(replies[channel]),
})

// Imports one folder into the fake main process's tree, as the real one adds
// the file's folders to the stored tree.
const mainProcessImportingOneFolder = (): DesktopApi => {
  const mainProcess = fakeMainProcess()
  return {
    invoke: async (channel, request) => {
      if (channel !== ipcChannels.importFolders) {
        return mainProcess.invoke(channel, request)
      }
      await mainProcess.invoke(ipcChannels.createFolder, { name: "Imported", parentFolderId: null })
      return { _tag: "FoldersImported", folderCount: 1 }
    },
  }
}

const mainProcessFailing = (): DesktopApi => ({
  invoke: () => Promise.reject(new Error("EACCES: permission denied")),
})

describe("Sidebar folder menu", () => {
  it("imports folders from the keyboard and says how many were added", async () => {
    renderScreen(
      <Sidebar width={280} />,
      mainProcessReplying({
        [ipcChannels.importFolders]: { _tag: "FoldersImported", folderCount: 3 },
      }),
    )
    const menuButton = await screen.findByRole("button", { name: "Folder options" })

    menuButton.focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: "Export folders…" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}{Enter}")

    expect(await screen.findByText("Imported 3 folders.")).toBeInTheDocument()
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
  })

  it("offers imported folders in Add to folder menus", async () => {
    const user = userEvent.setup()
    renderScreen(
      <FoldersProvider>
        <Sidebar width={280} />
      </FoldersProvider>,
      mainProcessImportingOneFolder(),
    )

    await user.click(await screen.findByRole("button", { name: "Folder options" }))
    await user.click(screen.getByRole("menuitem", { name: "Import folders…" }))
    await screen.findByText("Imported 1 folder.")
    await user.pointer({
      keys: "[MouseRight]",
      target: await screen.findByRole("link", { name: /^Small Hours/ }),
    })
    await user.click(screen.getByRole("menuitem", { name: "Add to folder" }))

    const folderSubmenu = screen.getByRole("menu", { name: "Add to folder" })
    expect(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Imported" })).toBeVisible()
  })

  it("confirms that the folders were exported", async () => {
    renderScreen(
      <Sidebar width={280} />,
      mainProcessReplying({ [ipcChannels.exportFolders]: { _tag: "FoldersExported" } }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(screen.getByRole("menuitem", { name: "Export folders…" }))

    expect(await screen.findByText("Exported your folders.")).toBeInTheDocument()
  })

  it("explains why a folders file was refused", async () => {
    renderScreen(
      <Sidebar width={280} />,
      mainProcessReplying({
        [ipcChannels.importFolders]: { _tag: "FoldersFileUnsupportedVersion", version: 2 },
      }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(screen.getByRole("menuitem", { name: "Import folders…" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That file uses folders format version 2, which this version of Open Spotify can't read. No folders were imported.",
    )
  })

  // A folder the user cannot write to, or a file that disappears before it is
  // read, fails in the main process instead of with a reply.
  it("says so when the folders cannot be exported", async () => {
    renderScreen(<Sidebar width={280} />, mainProcessFailing())

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(screen.getByRole("menuitem", { name: "Export folders…" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Your folders couldn't be exported.")
  })

  it("says so when a folders file cannot be imported", async () => {
    renderScreen(<Sidebar width={280} />, mainProcessFailing())

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(screen.getByRole("menuitem", { name: "Import folders…" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The file couldn't be imported. No folders were imported.",
    )
  })
})
