import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import type { FolderTree } from "../../../shared/folders"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { FolderPage } from "./folder-page"

const runningId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e01"
const warmUpId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e02"
const stretchingId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e03"

const folderTree: FolderTree = [
  {
    _tag: "Folder",
    id: runningId,
    name: "Running",
    entries: [
      {
        _tag: "SpotifyItem",
        uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
        name: "Quiet Rivers",
        imageUrl: null,
      },
      {
        _tag: "Folder",
        id: warmUpId,
        name: "Warm-up",
        entries: [
          { _tag: "Folder", id: stretchingId, name: "Stretching", entries: [] },
          {
            _tag: "SpotifyItem",
            uri: "spotify:playlist:37i9dQZF1DX76Wlfdnj7AP",
            name: "Easy Start",
            imageUrl: null,
          },
        ],
      },
      {
        _tag: "SpotifyItem",
        uri: "spotify:track:7ouMYWpwJ422jRcDASZB7P",
        name: "Golden Signals",
        imageUrl: null,
      },
      {
        _tag: "SpotifyItem",
        uri: "spotify:show:5CfCWKI5pZ28U0uOzXkDHe",
        name: "Slow Science",
        imageUrl: null,
      },
    ],
  },
]

const renderFolderPage = (
  folderId: string,
  mainProcess: DesktopApi = fakeMainProcess(folderTree),
) => renderScreen(<FolderPage folderId={folderId} />, mainProcess)

const folderContents = async () => screen.findByRole("list", { name: "Folder contents" })

const entryTexts = (list: HTMLElement) =>
  within(list)
    .getAllByRole("listitem")
    .map((entry) => entry.textContent)

describe("FolderPage", () => {
  it("shows the folder's name and item count", async () => {
    renderFolderPage(runningId)

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Running")
    expect(screen.getByText("4 items")).toBeInTheDocument()
  })

  it("shows the same entries in the grid and in the list", async () => {
    renderFolderPage(runningId)
    const gridEntries = entryTexts(await folderContents())

    await userEvent.click(screen.getByRole("button", { name: "List" }))
    const listEntries = entryTexts(await folderContents())

    expect(gridEntries).toEqual([
      "Quiet RiversTrack",
      "Warm-upFolder · 2 items",
      "Golden SignalsTrack",
      "Slow ScienceShow",
    ])
    expect(listEntries).toEqual(gridEntries)
  })

  it("remembers the chosen view the next time a folder opens", async () => {
    const mainProcess = fakeMainProcess(folderTree)
    renderFolderPage(runningId, mainProcess)
    await userEvent.click(await screen.findByRole("button", { name: "List" }))
    cleanup()

    renderFolderPage(warmUpId, mainProcess)

    expect(await screen.findByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("links nested folders and shows to their own pages", async () => {
    renderFolderPage(runningId)
    await folderContents()

    expect(screen.getByRole("link", { name: /Warm-up/ })).toHaveAttribute(
      "href",
      `/folder/${warmUpId}`,
    )
    expect(screen.getByRole("link", { name: /Slow Science/ })).toHaveAttribute(
      "href",
      "/show/5CfCWKI5pZ28U0uOzXkDHe",
    )
  })

  it("explains how to add items to an empty folder", async () => {
    renderFolderPage(stretchingId)

    expect(await screen.findByText(/This folder is empty/)).toHaveTextContent("Add to folder")
    expect(screen.queryByRole("list", { name: "Folder contents" })).not.toBeInTheDocument()
  })

  it("goes to a parent folder from the breadcrumb", async () => {
    const router = renderFolderPage(stretchingId)
    const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" })

    await userEvent.click(within(breadcrumb).getByRole("link", { name: "Warm-up" }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/folder/${warmUpId}`))
  })

  // The user can come back to a folder through history after deleting it.
  it("says so when the folder no longer exists", async () => {
    renderFolderPage("6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4eff")

    expect(await screen.findByText(/This folder doesn't exist/)).toBeInTheDocument()
  })
})
