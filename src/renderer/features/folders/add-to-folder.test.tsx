import { act, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Stream } from "effect"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import type { FolderTree } from "../../../shared/folders"
import { ipcChannels } from "../../../shared/ipc-channels"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { AlbumPage } from "../album/album-page"
import { DiscographySection } from "../artist/discography-section"
import { Library } from "../library/library"
import { PlaylistPage } from "../playlist/playlist-page"
import type { SavedAlbum } from "../spotify/spotify-album"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { FakeMainView } from "../track-list/fake-main-view"
import { TrackList } from "../track-list/track-list"
import type { TrackListEntry } from "../track-list/track-row"
import { FolderPage } from "./folder-page"
import { FoldersProvider } from "./folders-provider"
import { SidebarFolderTree } from "./sidebar-folder-tree"

const runningId = "3f9a6c1e-8b2d-4e7a-9c5f-1a2b3c4d5e6f"
const morningId = "7c2e9a4b-1d3f-4a6b-8e5c-9f0a1b2c3d4e"
const focusId = "b4d8e2f1-6a3c-4b9d-a7e5-2c1f0e9d8b7a"

const quietRivers: TrackListEntry = {
  trackId: "4uLU6hMCjMI75M1A2tKUQC",
  title: "Quiet Rivers",
  artists: [{ id: "0OdUWJ0sBjDrqHygGUXeCF", name: "Kite Theory" }],
  album: { id: "2noRn2Aes5aoNVsU6iWThc", name: "Low Orbit" },
  artwork: [{ url: "https://covers.open-spotify.invalid/low-orbit.jpg", width: 640 }],
  addedAt: null,
  durationMs: 200_000,
}

const lateNightDriveId = "fake-playlist-late-night-drive"
const lateNightDriveUri = "spotify:playlist:37i9dQZF1DX4wta20PHgwo"

// The main process accepts only real Spotify ids, which the shared fixtures
// do not use.
const lowOrbit: SavedAlbum = {
  album: {
    id: "2noRn2Aes5aoNVsU6iWThc",
    name: "Low Orbit",
    images: [{ url: "https://covers.open-spotify.invalid/low-orbit.jpg", width: 640, height: 640 }],
    artists: [{ id: "0OdUWJ0sBjDrqHygGUXeCF", name: "Kite Theory" }],
    uri: "spotify:album:2noRn2Aes5aoNVsU6iWThc",
  },
}

// Running already holds Quiet Rivers and Late Night Drive; Morning, inside
// it, and Focus do not.
const folderTree: FolderTree = [
  {
    _tag: "Folder",
    id: runningId,
    name: "Running",
    entries: [
      { _tag: "Folder", id: morningId, name: "Morning", entries: [] },
      {
        _tag: "SpotifyItem",
        uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
        name: "Quiet Rivers",
        imageUrl: null,
      },
      { _tag: "SpotifyItem", uri: lateNightDriveUri, name: "Late Night Drive", imageUrl: null },
    ],
  },
  { _tag: "Folder", id: focusId, name: "Focus", entries: [] },
]

const renderWithFolders = async (
  page: ReactNode,
  mainProcess: DesktopApi = fakeMainProcess({ folderTree }),
) => {
  await renderScreen(
    <StatusMessageProvider>
      <FoldersProvider>
        <Library />
        <FakeMainView>{page}</FakeMainView>
      </FoldersProvider>
    </StatusMessageProvider>,
    mainProcess,
    spotifyApiFakeWith((spotify) => ({
      savedAlbums: Stream.make(lowOrbit),
      getAlbum: (albumId) =>
        spotify
          .getAlbum(albumId)
          .pipe(Effect.map((album) => ({ ...album, uri: lowOrbit.album.uri }))),
      getPlaylist: (playlistId) =>
        spotify
          .getPlaylist(playlistId)
          .pipe(Effect.map((playlist) => ({ ...playlist, uri: lateNightDriveUri }))),
    })),
  )
  return userEvent.setup()
}

// Fails the first read of the folder tree, as a main process that did not
// reply would, and answers every later one.
const mainProcessFailingFirstTreeRead = (): DesktopApi => {
  const workingMainProcess = fakeMainProcess({ folderTree })
  let treeReads = 0
  return {
    invoke: (channel, request) => {
      if (channel === ipcChannels.getFolderTree && treeReads++ === 0) {
        return Promise.reject(new Error("The main process did not reply"))
      }
      return workingMainProcess.invoke(channel, request)
    },
  }
}

const trackList = (
  <TrackList
    label="Tracks"
    layout="playlist"
    trackCount={1}
    trackAt={() => quietRivers}
    playbackStartAt={() => ({ uris: [], offset: { position: 0 } })}
  />
)

type User = ReturnType<typeof userEvent.setup>

const trackRow = () => screen.findByRole("row", { name: "Quiet Rivers by Kite Theory" })

const sidebarAlbum = () => screen.findByRole("link", { name: /^Low Orbit.*Album/ })

// Opens the Add to folder submenu of the element's context menu.
const openFolderSubmenu = async (user: User, target: HTMLElement) => {
  await user.pointer({ keys: "[MouseRight]", target })
  await user.click(await screen.findByRole("menuitem", { name: "Add to folder", expanded: false }))
  return screen.getByRole("menu", { name: "Add to folder" })
}

const openRunningSubmenu = async (user: User, target: HTMLElement) => {
  const folderSubmenu = await openFolderSubmenu(user, target)
  await user.click(within(folderSubmenu).getByRole("menuitem", { name: "Running" }))
  return screen.getByRole("menu", { name: "Running" })
}

// The library has a status region of its own, for its filters.
const findStatusMessage = (text: string) => screen.findByText(text, { selector: "output > p" })

describe("Add to folder", () => {
  it("adds a track to the chosen folder and marks that folder afterwards", async () => {
    const user = await renderWithFolders(trackList)

    const folderSubmenu = await openFolderSubmenu(user, await trackRow())
    await user.click(
      within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Focus", checked: false }),
    )

    expect(await findStatusMessage("Added to Focus")).toBeInTheDocument()
    const reopenedSubmenu = await openFolderSubmenu(user, await trackRow())
    expect(
      within(reopenedSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }),
    ).toHaveAttribute("aria-checked", "true")
  })

  it("adds an album from the sidebar to a folder inside another folder", async () => {
    const user = await renderWithFolders(trackList)

    const runningSubmenu = await openRunningSubmenu(user, await sidebarAlbum())
    await user.click(within(runningSubmenu).getByRole("menuitemcheckbox", { name: "Morning" }))

    expect(await findStatusMessage("Added to Morning")).toBeInTheDocument()
    const reopenedSubmenu = await openRunningSubmenu(user, await sidebarAlbum())
    expect(
      within(reopenedSubmenu).getByRole("menuitemcheckbox", { name: "Morning" }),
    ).toHaveAttribute("aria-checked", "true")
  })

  it("removes the item from a folder that already holds it", async () => {
    const user = await renderWithFolders(trackList)

    const runningSubmenu = await openRunningSubmenu(user, await trackRow())
    await user.click(
      within(runningSubmenu).getByRole("menuitemcheckbox", { name: "Running", checked: true }),
    )

    expect(await findStatusMessage("Removed from Running")).toBeInTheDocument()
    const reopenedSubmenu = await openRunningSubmenu(user, await trackRow())
    expect(
      within(reopenedSubmenu).getByRole("menuitemcheckbox", { name: "Running" }),
    ).toHaveAttribute("aria-checked", "false")
  })

  it("creates a new folder with the item in it", async () => {
    const user = await renderWithFolders(trackList)

    const folderSubmenu = await openFolderSubmenu(user, await trackRow())
    await user.click(within(folderSubmenu).getByRole("menuitem", { name: "New folder…" }))
    const dialog = screen.getByRole("dialog", { name: "New folder" })
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Evening")
    await user.click(within(dialog).getByRole("button", { name: "Create folder" }))

    expect(await findStatusMessage("Added to Evening")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    const reopenedSubmenu = await openFolderSubmenu(user, await trackRow())
    expect(
      within(reopenedSubmenu).getByRole("menuitemcheckbox", { name: "Evening" }),
    ).toHaveAttribute("aria-checked", "true")
  })

  it("asks for a name instead of creating a folder with a blank one", async () => {
    const user = await renderWithFolders(trackList)

    const folderSubmenu = await openFolderSubmenu(user, await trackRow())
    await user.click(within(folderSubmenu).getByRole("menuitem", { name: "New folder…" }))
    const dialog = screen.getByRole("dialog", { name: "New folder" })
    const nameField = within(dialog).getByRole("textbox", { name: "Name" })
    await user.type(nameField, "   ")
    await user.click(within(dialog).getByRole("button", { name: "Create folder" }))

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a name for the folder.")
    expect(nameField).toHaveAccessibleDescription("Enter a name for the folder.")
    expect(screen.getByRole("dialog", { name: "New folder" })).toBeInTheDocument()

    await user.type(nameField, "Evening")
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument()
    expect(nameField).toBeValid()
  })

  it("adds an album to a folder from its page header's context menu", async () => {
    const user = await renderWithFolders(<AlbumPage albumId="fake-album-4" />)
    const header = await screen.findByRole("group", { name: "Low Orbit" })

    header.focus()
    await user.keyboard("{Shift>}{F10}{/Shift}")
    await user.click(screen.getByRole("menuitem", { name: "Add to folder" }))
    const folderSubmenu = screen.getByRole("menu", { name: "Add to folder" })
    await user.click(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }))

    expect(await findStatusMessage("Added to Focus")).toBeInTheDocument()
    const reopenedSubmenu = await openFolderSubmenu(user, header)
    expect(
      within(reopenedSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }),
    ).toHaveAttribute("aria-checked", "true")
  })

  it("adds an album to a folder from its card's context menu", async () => {
    const user = await renderWithFolders(
      <DiscographySection
        title="Albums"
        artistId="0OdUWJ0sBjDrqHygGUXeCF"
        albumGroup="album"
        firstPage={{ items: [{ ...lowOrbit.album, releaseDate: "2024" }], next: null, total: 1 }}
      />,
    )
    const albums = await screen.findByRole("list", { name: "Albums" })
    const card = within(albums).getByRole("link", { name: /Low Orbit/ })

    card.focus()
    await user.keyboard("{Shift>}{F10}{/Shift}")
    await user.click(screen.getByRole("menuitem", { name: "Add to folder" }))
    const folderSubmenu = screen.getByRole("menu", { name: "Add to folder" })
    await user.click(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }))

    expect(await findStatusMessage("Added to Focus")).toBeInTheDocument()
    const reopenedSubmenu = await openFolderSubmenu(user, card)
    expect(
      within(reopenedSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }),
    ).toHaveAttribute("aria-checked", "true")
  })

  it("removes a playlist from a folder with its page's More options button", async () => {
    const user = await renderWithFolders(<PlaylistPage playlistId={lateNightDriveId} />)

    await user.click(await screen.findByRole("button", { name: "More options" }))
    await user.click(screen.getByRole("menuitem", { name: "Add to folder" }))
    const folderSubmenu = screen.getByRole("menu", { name: "Add to folder" })
    await user.click(within(folderSubmenu).getByRole("menuitem", { name: "Running" }))
    await user.click(
      within(screen.getByRole("menu", { name: "Running" })).getByRole("menuitemcheckbox", {
        name: "Running",
        checked: true,
      }),
    )

    expect(await findStatusMessage("Removed from Running")).toBeInTheDocument()
  })

  // A page that went back to its loading state to show the item would lose
  // the user's place in a long folder.
  it("shows an item added from the sidebar on the open folder's page, in place", async () => {
    const user = await renderWithFolders(<FolderPage folderId={focusId} />)
    const heading = await screen.findByRole("heading", { level: 1, name: "Focus" })

    const folderSubmenu = await openFolderSubmenu(user, await sidebarAlbum())
    await user.click(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }))

    const contents = await screen.findByRole("list", { name: "Folder contents" })
    expect(within(contents).getByRole("link", { name: /Low Orbit/ })).toBeInTheDocument()
    expect(heading).toBeInTheDocument()
  })

  it("shows a library entry added to a folder in the sidebar folder tree", async () => {
    const user = await renderWithFolders(<SidebarFolderTree />)

    const folderSubmenu = await openFolderSubmenu(user, await sidebarAlbum())
    await user.click(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }))
    act(() => screen.getByRole("treeitem", { name: /^Focus/ }).focus())
    await user.keyboard("{ArrowRight}")

    const addedItem = await screen.findByRole("treeitem", { name: /^Low Orbit/ })
    expect(addedItem).toHaveAttribute("aria-level", "2")
  })

  // Liked Songs is not an item Spotify can link to, so no folder can hold it.
  it("opens no menu for Liked Songs", async () => {
    const user = await renderWithFolders(trackList)

    await user.pointer({
      keys: "[MouseRight]",
      target: await screen.findByRole("link", { name: /^Liked Songs/ }),
    })

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("says when the item could not be added", async () => {
    const user = await renderWithFolders(
      trackList,
      mainProcessFailingOn(ipcChannels.addFolderItem, fakeMainProcess({ folderTree })),
    )

    const folderSubmenu = await openFolderSubmenu(user, await trackRow())
    await user.click(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Focus" }))

    expect(await findStatusMessage("Couldn't add to Focus.")).toBeInTheDocument()
  })

  // The folder exists even though the item did not go in, so it must show up
  // in the menu instead of being created again on the next try.
  it("lists a new folder whose item could not be added", async () => {
    const user = await renderWithFolders(
      trackList,
      mainProcessFailingOn(ipcChannels.addFolderItem, fakeMainProcess({ folderTree })),
    )

    const folderSubmenu = await openFolderSubmenu(user, await trackRow())
    await user.click(within(folderSubmenu).getByRole("menuitem", { name: "New folder…" }))
    const dialog = screen.getByRole("dialog", { name: "New folder" })
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Evening")
    await user.click(within(dialog).getByRole("button", { name: "Create folder" }))

    expect(await findStatusMessage("Couldn't add to Evening.")).toBeInTheDocument()
    const reopenedSubmenu = await openFolderSubmenu(user, await trackRow())
    expect(
      within(reopenedSubmenu).getByRole("menuitemcheckbox", { name: "Evening" }),
    ).toHaveAttribute("aria-checked", "false")
  })

  it("loads the folders again after they failed to load", async () => {
    const user = await renderWithFolders(trackList, mainProcessFailingFirstTreeRead())

    await user.pointer({ keys: "[MouseRight]", target: await trackRow() })
    await user.click(screen.getByRole("menuitem", { name: "Add to folder" }))

    expect(await findStatusMessage("Your folders didn't load. Trying again.")).toBeInTheDocument()
    const folderSubmenu = await openFolderSubmenu(user, await trackRow())
    expect(within(folderSubmenu).getByRole("menuitemcheckbox", { name: "Focus" })).toBeVisible()
  })
})
