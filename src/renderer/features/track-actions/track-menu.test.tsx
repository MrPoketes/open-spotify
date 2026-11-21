import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { type ReactNode, useState } from "react"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { NoActiveDevice, type SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { spotifyApiFake, spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"
import { FakeMainView } from "../track-list/fake-main-view"
import { TrackList } from "../track-list/track-list"
import type { TrackListEntry } from "../track-list/track-row"
import { type EditablePlaylists, EditablePlaylistsContext } from "./editable-playlists"
import { EditablePlaylistsProvider } from "./editable-playlists-provider"

const trackWithTwoArtists: TrackListEntry = {
  trackId: "fake-track-0",
  title: "Harbour Lights",
  artists: [
    { id: "fake-artist-0", name: "Northbound Static" },
    { id: "fake-artist-1", name: "Lena Varga" },
  ],
  album: { id: "fake-album-0", name: "Glass Harbour" },
  artwork: [],
  addedAt: null,
  durationMs: 200_000,
}

const trackWithOneArtist: TrackListEntry = {
  ...trackWithTwoArtists,
  trackId: "fake-track-1",
  title: "Low Tide",
  artists: [{ id: "fake-artist-2", name: "Kite Theory" }],
}

const localFile: TrackListEntry = {
  trackId: null,
  title: "Voice memo",
  artists: [{ id: null, name: "Mira Kaelin" }],
  album: { id: null, name: "Recordings" },
  artwork: [],
  addedAt: null,
  durationMs: 60_000,
}

const entries = [trackWithTwoArtists, trackWithOneArtist, localFile]

type PlaylistsProvider = (props: { readonly children: ReactNode }) => ReactNode

const ideasForLater: SimplifiedPlaylist = {
  id: "fake-playlist-ideas",
  name: "Ideas for Later",
  description: null,
  images: null,
  owner: { id: "fake-listener", displayName: "Mira Kaelin" },
  collaborative: false,
  uri: "spotify:playlist:fake-playlist-ideas",
  items: { total: 0 },
}

// The real provider settles before a test can open the menu, so these stand
// in for the states it passes through.
function PlaylistsStillLoading({ children }: { readonly children: ReactNode }) {
  const loading: EditablePlaylists = { state: { status: "loading" }, retry: () => undefined }
  return <EditablePlaylistsContext value={loading}>{children}</EditablePlaylistsContext>
}

function NoEditablePlaylists({ children }: { readonly children: ReactNode }) {
  const loadedNone: EditablePlaylists = {
    state: { status: "loaded", value: [] },
    retry: () => undefined,
  }
  return <EditablePlaylistsContext value={loadedNone}>{children}</EditablePlaylistsContext>
}

function PlaylistsFailingUntilRetried({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<EditablePlaylists["state"]>({
    status: "failed",
    error: new SpotifyResponseError({ status: 503, message: "Service unavailable" }),
  })
  const retry = () => setState({ status: "loaded", value: [ideasForLater] })
  return <EditablePlaylistsContext value={{ state, retry }}>{children}</EditablePlaylistsContext>
}

const renderTracks = async (
  spotifyApi: Layer.Layer<SpotifyApi> = spotifyApiFake,
  Playlists: PlaylistsProvider = EditablePlaylistsProvider,
) => {
  const user = userEvent.setup()
  const router = renderScreen(
    <StatusMessageProvider>
      <Playlists>
        <FakeMainView>
          <TrackList
            label="Tracks"
            layout="playlist"
            trackCount={entries.length}
            trackAt={(index) => entries[index]}
            playbackStartAt={(index) => ({ uris: [], offset: { position: index } })}
          />
        </FakeMainView>
      </Playlists>
    </StatusMessageProvider>,
    fakeMainProcess(),
    spotifyApi,
  )
  const row = await screen.findByRole("row", {
    name: "Harbour Lights by Northbound Static, Lena Varga",
  })
  return { user, router, row }
}

type User = ReturnType<typeof userEvent.setup>

const chooseFromMenu = async (user: User, row: HTMLElement, itemName: string) => {
  await user.pointer({ keys: "[MouseRight]", target: row })
  await user.click(screen.getByRole("menuitem", { name: itemName }))
}

// Add to playlist opens its submenu once the playlists have loaded.
const openPlaylistSubmenu = async (user: User, row: HTMLElement) => {
  await user.pointer({ keys: "[MouseRight]", target: row })
  await user.click(
    await screen.findByRole("menuitem", { name: "Add to playlist", expanded: false }),
  )
  return screen.getByRole("menu", { name: "Add to playlist" })
}

const findStatusMessage = (text: string) => within(screen.getByRole("status")).findByText(text)

describe("Track menu", () => {
  it("goes to the track's album from the menu of the focused row", async () => {
    const { user, router, row } = await renderTracks()
    row.focus()

    await user.keyboard("{Shift>}{F10}{/Shift}")
    expect(screen.getByRole("menu", { name: "Actions for Harbour Lights" })).toBeInTheDocument()
    await user.keyboard("{End}{ArrowUp}{Enter}")

    await waitFor(() => expect(router.state.location.pathname).toBe("/album/fake-album-0"))
  })

  it("lists each artist of a track with several artists under Go to artist", async () => {
    const { user, router, row } = await renderTracks()

    await user.pointer({ keys: "[MouseRight]", target: row })
    await user.click(screen.getByRole("menuitem", { name: "Go to artist" }))
    await user.click(screen.getByRole("menuitem", { name: "Lena Varga" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/artist/fake-artist-1"))
  })

  it("goes straight to the artist of a track with one artist", async () => {
    const { user, router } = await renderTracks()

    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByRole("row", { name: "Low Tide by Kite Theory" }),
    })
    await user.click(screen.getByRole("menuitem", { name: "Go to artist" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/artist/fake-artist-2"))
  })

  it("copies the track's Spotify link and says so", async () => {
    const { user, row } = await renderTracks()

    await user.pointer({ keys: "[MouseRight]", target: row })
    await user.click(screen.getByRole("menuitem", { name: "Copy link" }))

    expect(await screen.findByRole("status")).toHaveTextContent("Link copied")
    expect(await navigator.clipboard.readText()).toBe("https://open.spotify.com/track/fake-track-0")
  })

  // A local file has no Spotify link, album page, or artist page, so every
  // action would lead nowhere.
  it("opens no menu for a local file", async () => {
    const { user } = await renderTracks()

    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByRole("row", { name: "Voice memo by Mira Kaelin" }),
    })

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})

describe("Track menu changes in Spotify", () => {
  it("adds the track to the chosen playlist and says so", async () => {
    const additions: Array<readonly [string, string]> = []
    const { user, row } = await renderTracks(
      spotifyApiFakeWith((spotify) => ({
        addToPlaylist: (playlistId, uri) =>
          Effect.sync(() => additions.push([playlistId, uri])).pipe(
            Effect.andThen(spotify.addToPlaylist(playlistId, uri)),
          ),
      })),
    )

    const submenu = await openPlaylistSubmenu(user, row)
    await user.click(within(submenu).getByRole("menuitem", { name: "Road Trip with Sam" }))

    expect(await findStatusMessage("Added to Road Trip with Sam")).toBeInTheDocument()
    expect(additions).toEqual([["fake-playlist-road-trip", "spotify:track:fake-track-0"]])
  })

  // Spotify refuses to add to a playlist the user only follows.
  it("offers only the playlists the user owns or collaborates on", async () => {
    const { user, row } = await renderTracks()

    const submenu = await openPlaylistSubmenu(user, row)

    expect(
      within(submenu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Late Night Drive",
      "Morning Coffee",
      "Ideas for Later",
      "The Big Archive",
      "Road Trip with Sam",
    ])
  })

  it("says when the track could not be added to a playlist", async () => {
    const { user, row } = await renderTracks(
      spotifyApiFakeWith(() => ({
        addToPlaylist: () =>
          Effect.fail(new SpotifyResponseError({ status: 500, message: "Server error" })),
      })),
    )

    const submenu = await openPlaylistSubmenu(user, row)
    await user.click(within(submenu).getByRole("menuitem", { name: "Ideas for Later" }))

    expect(await findStatusMessage("Couldn't add to Ideas for Later.")).toBeInTheDocument()
  })

  it("says the playlists are still loading when they have not arrived yet", async () => {
    const { user, row } = await renderTracks(spotifyApiFake, PlaylistsStillLoading)

    await chooseFromMenu(user, row, "Add to playlist")

    expect(await findStatusMessage("Your playlists are still loading.")).toBeInTheDocument()
  })

  it("says there is no playlist to add to when the user can edit none", async () => {
    const { user, row } = await renderTracks(spotifyApiFake, NoEditablePlaylists)

    await chooseFromMenu(user, row, "Add to playlist")

    expect(await findStatusMessage("You have no playlists to add to.")).toBeInTheDocument()
  })

  it("loads the playlists again after they failed to load", async () => {
    const { user, row } = await renderTracks(spotifyApiFake, PlaylistsFailingUntilRetried)

    await chooseFromMenu(user, row, "Add to playlist")
    expect(await findStatusMessage("Your playlists didn't load. Trying again.")).toBeInTheDocument()
    const submenu = await openPlaylistSubmenu(user, row)

    expect(within(submenu).getByRole("menuitem", { name: "Ideas for Later" })).toBeInTheDocument()
  })

  it("adds the track to the queue and says so", async () => {
    const { user, row } = await renderTracks()

    await chooseFromMenu(user, row, "Add to queue")

    expect(await findStatusMessage("Added to queue")).toBeInTheDocument()
  })

  // Playback is remote control, so only an official Spotify app can play the
  // queue (decision 0002).
  it("tells the user to start playback in the Spotify app when no device is playing", async () => {
    const { user, row } = await renderTracks(
      spotifyApiFakeWith(() => ({ addToQueue: () => Effect.fail(new NoActiveDevice()) })),
    )

    await chooseFromMenu(user, row, "Add to queue")

    expect(
      await findStatusMessage(
        "No device is playing. Start playback in the Spotify app, then try again.",
      ),
    ).toBeInTheDocument()
  })
})
