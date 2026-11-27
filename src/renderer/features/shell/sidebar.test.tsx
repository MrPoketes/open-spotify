import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Stream } from "effect"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import type { FolderTree } from "../../../shared/folders"
import { ipcChannels } from "../../../shared/ipc-channels"
import { AccessTokenUnavailable, SessionExpired } from "../../../shared/spotify-auth-replies"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { openAddToFolder } from "../folders/add-to-folder-menu-queries"
import { FoldersProvider } from "../folders/folders-provider"
import type { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { Sidebar } from "./sidebar"

// The fake follows 55 artists so that paging tests must follow the cursor.
// These tests never look at them, and rendering them in every test made the
// file time out when several test suites ran at once.
const renderSidebar = (sidebar: ReactNode, mainProcess: DesktopApi) =>
  renderScreen(
    sidebar,
    mainProcess,
    spotifyApiFakeWith(() => ({ followedArtists: Stream.empty })),
  )

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
    await renderSidebar(
      <Sidebar savedWidth={280} savedCollapsed={false} />,
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
    await renderSidebar(
      <FoldersProvider>
        <Sidebar savedWidth={280} savedCollapsed={false} />
      </FoldersProvider>,
      mainProcessImportingOneFolder(),
    )

    await user.click(await screen.findByRole("button", { name: "Folder options" }))
    await user.click(await screen.findByRole("menuitem", { name: "Import folders…" }))
    await screen.findByText("Imported 1 folder.")
    await user.pointer({
      keys: "[MouseRight]",
      target: await screen.findByRole("link", { name: /^Small Hours/ }),
    })
    const folderSubmenu = await openAddToFolder(user)

    expect(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Imported" })).toBeVisible()
  })

  it("confirms that the folders were exported", async () => {
    await renderSidebar(
      <Sidebar savedWidth={280} savedCollapsed={false} />,
      mainProcessReplying({ [ipcChannels.exportFolders]: { _tag: "FoldersExported" } }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Export folders…" }))

    expect(await screen.findByText("Exported your folders.")).toBeInTheDocument()
  })

  it("explains why a folders file was refused", async () => {
    await renderSidebar(
      <Sidebar savedWidth={280} savedCollapsed={false} />,
      mainProcessReplying({
        [ipcChannels.importFolders]: { _tag: "FoldersFileUnsupportedVersion", version: 2 },
      }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Import folders…" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That file uses folders format version 2, which this version of Open Spotify can't read. No folders were imported.",
    )
  })

  // A folder the user cannot write to, or a file that disappears before it is
  // read, fails in the main process instead of with a reply.
  it("says so when the folders cannot be exported", async () => {
    await renderSidebar(<Sidebar savedWidth={280} savedCollapsed={false} />, mainProcessFailing())

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Export folders…" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Your folders couldn't be exported.")
  })

  it("says so when a folders file cannot be imported", async () => {
    await renderSidebar(<Sidebar savedWidth={280} savedCollapsed={false} />, mainProcessFailing())

    await userEvent.click(await screen.findByRole("button", { name: "Folder options" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Import folders…" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The file couldn't be imported. No folders were imported.",
    )
  })
})

const roadTripTree: FolderTree = [
  { _tag: "Folder", id: "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e01", name: "Road trip", entries: [] },
]

describe("Sidebar folder tree", () => {
  it("shows the folder tree above the library sections", async () => {
    await renderSidebar(
      <FoldersProvider>
        <Sidebar savedWidth={280} savedCollapsed={false} />
      </FoldersProvider>,
      fakeMainProcess({ folderTree: roadTripTree }),
    )

    const folders = await screen.findByRole("tree", { name: "Folders" })
    const playlists = await screen.findByRole("region", { name: "Playlists" })

    expect(folders.compareDocumentPosition(playlists)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("shows imported folders in the tree without a restart", async () => {
    const user = userEvent.setup()
    await renderSidebar(
      <FoldersProvider>
        <Sidebar savedWidth={280} savedCollapsed={false} />
      </FoldersProvider>,
      mainProcessImportingOneFolder(),
    )

    await user.click(await screen.findByRole("button", { name: "Folder options" }))
    await user.click(await screen.findByRole("menuitem", { name: "Import folders…" }))

    expect(await screen.findByRole("treeitem", { name: /^Imported/ })).toBeInTheDocument()
  })
})

const runningId = "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e02"

// Running holds a playlist and Warm-up, which holds an album.
const runningTree: FolderTree = [
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
        id: "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e03",
        name: "Warm-up",
        entries: [
          {
            _tag: "SpotifyItem",
            uri: "spotify:album:4aawyAB9vmqN3uQ7FjRGTy",
            name: "Pace",
            imageUrl: null,
          },
        ],
      },
    ],
  },
  { _tag: "Folder", id: "6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4e04", name: "Focus", entries: [] },
]

type LibraryStreams = Partial<
  Pick<SpotifyApi["Service"], "currentUserPlaylists" | "savedAlbums" | "savedShows">
>

// The rail lists every library entry, so each test gets only the library
// streams it reads.
const renderRail = (
  mainProcess: DesktopApi = fakeMainProcess(),
  library: (spotify: SpotifyApi["Service"]) => LibraryStreams = () => ({}),
) =>
  renderScreen(
    <FoldersProvider>
      <Sidebar savedWidth={280} savedCollapsed />
    </FoldersProvider>,
    mainProcess,
    spotifyApiFakeWith((spotify) => ({
      currentUserPlaylists: Stream.empty,
      savedAlbums: Stream.empty,
      followedArtists: Stream.empty,
      savedShows: Stream.empty,
      ...library(spotify),
    })),
  )

const withPlaylists = (spotify: SpotifyApi["Service"]) => ({
  currentUserPlaylists: spotify.currentUserPlaylists,
})

describe("Sidebar icon rail", () => {
  // The rail shows no text, so the accessible name is all a screen reader has.
  it("names each library entry, which shows only its artwork", async () => {
    await renderRail(fakeMainProcess(), withPlaylists)

    const entry = await screen.findByRole("link", {
      name: "Late Night Drive, Playlist · Mira Kaelin",
    })

    expect(entry).toHaveTextContent("")
    expect(screen.getByRole("list", { name: "Playlists" })).toContainElement(entry)
  })

  it("shows an entry's name in a tooltip on hover and on keyboard focus", async () => {
    await renderRail(fakeMainProcess(), withPlaylists)
    const entry = await screen.findByRole("link", { name: /^Late Night Drive/ })

    await userEvent.hover(entry)
    expect(await screen.findByText("Late Night Drive")).toBeInTheDocument()
    await userEvent.unhover(entry)
    await waitFor(() => expect(screen.queryByText("Late Night Drive")).not.toBeInTheDocument())

    // Past the Expand sidebar button and the Liked Songs list.
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(entry).toHaveFocus()
    expect(await screen.findByText("Late Night Drive")).toBeInTheDocument()
  })

  it("opens an entry's page from the rail", async () => {
    const router = await renderRail(fakeMainProcess(), withPlaylists)

    await userEvent.click(await screen.findByRole("link", { name: /^Late Night Drive/ }))

    expect(router.state.location.pathname).toMatch(/^\/playlist\//)
  })

  it("opens a folder's contents beside the rail, down to the entries of a folder inside it", async () => {
    const router = await renderRail(fakeMainProcess({ folderTree: runningTree }))
    const running = await screen.findByRole("button", { name: "Running, Folder · 2 items" })

    running.focus()
    await userEvent.keyboard("{Enter}")
    const menu = await screen.findByRole("menu", { name: "Running" })
    expect(within(menu).getByRole("menuitem", { name: "Open Running" })).toBeInTheDocument()
    expect(within(menu).getByRole("menuitem", { name: "Easy Start" })).toBeInTheDocument()
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Warm-up" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Pace" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/album/4aawyAB9vmqN3uQ7FjRGTy"),
    )
  })

  // The rail has no room for the message and Retry, so it must lead to them.
  it("expands the sidebar to show a failure the rail has no room for", async () => {
    await renderRail(mainProcessFailing())

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Your folders didn't load. Expand the sidebar to see why.",
      }),
    )

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("goes to the login screen when the library fails for an expired session", async () => {
    const router = await renderRail(fakeMainProcess(), () => ({
      savedShows: Stream.fail(new SessionExpired()),
    }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })

  it("offers to expand the sidebar when the library fails for a reason Retry can fix", async () => {
    await renderRail(fakeMainProcess(), () => ({
      savedShows: Stream.fail(new AccessTokenUnavailable({ message: "Spotify is unreachable" })),
    }))

    expect(
      await screen.findByRole("button", {
        name: "Your library didn't load. Expand the sidebar to see why.",
      }),
    ).toBeInTheDocument()
  })

  it("moves between folders with the arrow keys instead of opening one", async () => {
    await renderRail(fakeMainProcess({ folderTree: runningTree }))
    const running = await screen.findByRole("button", { name: /^Running/ })

    running.focus()
    await userEvent.keyboard("{ArrowDown}")

    expect(screen.getByRole("button", { name: /^Focus/ })).toHaveFocus()
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
