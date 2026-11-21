import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import type { FolderTree } from "../../../shared/folders"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { NoActiveDevice, type SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFake, spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import type { PlaybackStart } from "../spotify/spotify-player-requests"
import { FolderPage } from "./folder-page"
import { FoldersProvider } from "./folders-provider"

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
      {
        _tag: "SpotifyItem",
        uri: "spotify:album:2noRn2Aes5aoNVsU6iWThc",
        name: "Low Orbit",
        imageUrl: null,
      },
      {
        _tag: "SpotifyItem",
        uri: "spotify:artist:0OdUWJ0sBjDrqHygGUXeCF",
        name: "Kite Theory",
        imageUrl: null,
      },
      {
        _tag: "SpotifyItem",
        uri: "spotify:playlist:1h0CEZCm6IbFTbxThn6Xcs",
        name: "Long Run",
        imageUrl: null,
      },
    ],
  },
]

const renderFolderPage = (
  folderId: string,
  mainProcess: DesktopApi = fakeMainProcess({ folderTree }),
  spotifyApi: Layer.Layer<SpotifyApi> = spotifyApiFake,
) =>
  renderScreen(
    <StatusMessageProvider>
      <FoldersProvider>
        <FolderPage folderId={folderId} />
      </FoldersProvider>
    </StatusMessageProvider>,
    mainProcess,
    spotifyApi,
  )

// The fake server only plays its own fixture tracks, whose made-up ids the
// folder tree's Schema rejects, so the playback start is recorded instead.
const spotifyRecordingPlaybackStarts = (playbackStarts: Array<PlaybackStart>) =>
  spotifyApiFakeWith(() => ({
    startPlayback: (start) => Effect.sync(() => playbackStarts.push(start)),
  }))

// Serves the folder tree while reachable and fails like a main process that
// does not reply while unreachable.
const mainProcessWithConnection = () => {
  const workingMainProcess = fakeMainProcess({ folderTree })
  let reachable = true
  return {
    invoke: (channel, request) =>
      reachable
        ? workingMainProcess.invoke(channel, request)
        : Promise.reject(new Error("The main process did not reply")),
    setReachable: (isReachable: boolean) => {
      reachable = isReachable
    },
  } satisfies DesktopApi & { readonly setReachable: (isReachable: boolean) => void }
}

const folderContents = async () => screen.findByRole("list", { name: "Folder contents" })

const entryTexts = (list: HTMLElement) =>
  within(list)
    .getAllByRole("listitem")
    .map((entry) => entry.textContent)

describe("FolderPage", () => {
  it("shows the folder's name and item count", async () => {
    renderFolderPage(runningId)

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Running")
    expect(screen.getByText("7 items")).toBeInTheDocument()
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
      "Low OrbitAlbum",
      "Kite TheoryArtist",
      "Long RunPlaylist",
    ])
    expect(listEntries).toEqual(gridEntries)
  })

  it("remembers the chosen view the next time a folder opens", async () => {
    const mainProcess = fakeMainProcess({ folderTree })
    renderFolderPage(runningId, mainProcess)
    await userEvent.click(await screen.findByRole("button", { name: "List" }))
    cleanup()

    renderFolderPage(warmUpId, mainProcess)

    expect(await screen.findByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it.each(["Grid", "List"])(
    "links every kind of entry to its page in the %s view",
    async (view) => {
      renderFolderPage(runningId)
      await userEvent.click(await screen.findByRole("button", { name: view }))
      const entries = await folderContents()

      const pageOf = (name: RegExp) =>
        within(entries).getByRole("link", { name }).getAttribute("href")
      expect(pageOf(/Warm-up/)).toBe(`/folder/${warmUpId}`)
      expect(pageOf(/Slow Science/)).toBe("/show/5CfCWKI5pZ28U0uOzXkDHe")
      expect(pageOf(/Low Orbit/)).toBe("/album/2noRn2Aes5aoNVsU6iWThc")
      expect(pageOf(/Kite Theory/)).toBe("/artist/0OdUWJ0sBjDrqHygGUXeCF")
      expect(pageOf(/Long Run/)).toBe("/playlist/1h0CEZCm6IbFTbxThn6Xcs")
      expect(pageOf(/Quiet Rivers/)).toBe("/track/4uLU6hMCjMI75M1A2tKUQC")
    },
  )

  it("plays the folder's tracks in folder order from the play button", async () => {
    const playbackStarts: Array<PlaybackStart> = []
    renderFolderPage(
      runningId,
      fakeMainProcess({ folderTree }),
      spotifyRecordingPlaybackStarts(playbackStarts),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Play Running" }))

    await waitFor(() =>
      expect(playbackStarts).toEqual([
        { uris: ["spotify:track:4uLU6hMCjMI75M1A2tKUQC", "spotify:track:7ouMYWpwJ422jRcDASZB7P"] },
      ]),
    )
  })

  // Spotify queues only tracks, so the user must learn why the folder's
  // playlists, albums, artists, and shows do not play.
  it("describes the play button with how many tracks play and why the rest do not", async () => {
    renderFolderPage(runningId)

    expect(await screen.findByRole("button", { name: "Play Running" })).toHaveAccessibleDescription(
      "Plays the folder's 2 tracks. Spotify can't queue the other items.",
    )
  })

  it("hides the play button in a folder without tracks", async () => {
    renderFolderPage(warmUpId)

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Warm-up")
    expect(screen.queryByRole("button", { name: "Play Warm-up" })).not.toBeInTheDocument()
  })

  it("says to choose a device when playing the folder finds no device", async () => {
    renderFolderPage(
      runningId,
      fakeMainProcess({ folderTree }),
      spotifyApiFakeWith(() => ({ startPlayback: () => Effect.fail(new NoActiveDevice()) })),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Play Running" }))

    expect(
      await screen.findByText("No device is playing. Choose a device, then try again."),
    ).toBeInTheDocument()
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

  it("shows an error when the folder cannot load, and loads it on retry", async () => {
    const mainProcess = mainProcessWithConnection()
    mainProcess.setReachable(false)
    renderFolderPage(runningId, mainProcess)

    expect(await screen.findByRole("alert")).toHaveTextContent("This folder didn't load.")
    mainProcess.setReachable(true)
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Running")
  })

  // The user can come back to a folder through history after deleting it.
  it("says so when the folder no longer exists", async () => {
    renderFolderPage("6f1c1b7e-2f0a-4c55-9d1e-0a1b2c3d4eff")

    expect(await screen.findByText(/This folder doesn't exist/)).toBeInTheDocument()
  })
})
