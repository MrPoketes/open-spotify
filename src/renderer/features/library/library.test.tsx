import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Layer, ManagedRuntime, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { SpotifyApi, type SpotifyApiError, SpotifyResponseError } from "../spotify/spotify-api"
import {
  fakeFollowedArtists,
  fakePlaylists,
  fakeSavedAlbums,
  fakeSavedShows,
} from "../spotify/spotify-fixtures"
import { Library } from "./library"

// Replaces some of the fake Spotify API's operations, keeping the rest.
const spotifyApiWith = (
  overrides: (spotify: SpotifyApi["Service"]) => Partial<SpotifyApi["Service"]>,
) =>
  Layer.effect(
    SpotifyApi,
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      return SpotifyApi.of({ ...spotify, ...overrides(spotify) })
    }),
  ).pipe(Layer.provide(SpotifyApi.layerFake))

// Fails the first time it runs, like a request that hit a brief outage.
const failingOnce = <A,>(stream: Stream.Stream<A, SpotifyApiError>) => {
  let hasFailed = false
  return Stream.suspend(() => {
    if (hasFailed) {
      return stream
    }
    hasFailed = true
    return Stream.fail(new SpotifyResponseError({ status: 503, message: "Service unavailable" }))
  })
}

const renderLibrary = (spotifyApi: Layer.Layer<SpotifyApi> = SpotifyApi.layerFake) => {
  const desktopBridge = Layer.succeed(DesktopBridge)(DesktopBridge.make(fakeMainProcess()))
  const runtime = ManagedRuntime.make(Layer.merge(spotifyApi, desktopBridge))
  render(
    <RendererRuntimeContext value={runtime}>
      <Library />
    </RendererRuntimeContext>,
  )
}

const libraryEntries = async () => within(await screen.findByRole("list")).getAllByRole("listitem")

const entryTexts = async () => (await libraryEntries()).map(({ textContent }) => textContent)

describe("Library", () => {
  it("says the library is loading until it arrives", async () => {
    renderLibrary()

    expect(screen.getByRole("status")).toHaveTextContent("Loading your library")
    await screen.findByRole("list")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("lists Liked Songs, playlists, albums, artists, and shows with what each one is", async () => {
    renderLibrary()

    const entries = await libraryEntries()

    expect(entries).toHaveLength(
      1 +
        fakePlaylists.length +
        fakeSavedAlbums.length +
        fakeFollowedArtists.length +
        fakeSavedShows.length,
    )
    expect(await entryTexts()).toEqual(
      expect.arrayContaining([
        "Liked SongsPlaylist · 57 songs",
        "Road Trip with SamPlaylist · Sam Okafor",
        "Small HoursAlbum · Lena Varga",
        "Velvet ChoirArtist",
        "Slow ScienceShow",
      ]),
    )
  })

  it("explains where entries come from when the library is empty", async () => {
    renderLibrary(
      spotifyApiWith(() => ({
        likedSongsCount: Effect.succeed(0),
        currentUserPlaylists: Stream.empty,
        savedAlbums: Stream.empty,
        followedArtists: Stream.empty,
        savedShows: Stream.empty,
      })),
    )

    expect(
      await screen.findByText("Playlists, albums, artists, and shows you save will appear here."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("loads the library again when Retry is pressed after a failed request", async () => {
    renderLibrary(spotifyApiWith((spotify) => ({ savedShows: failingOnce(spotify.savedShows) })))

    const failure = await screen.findByRole("alert")
    expect(failure).toHaveTextContent("Your library didn't load.")
    await userEvent.click(within(failure).getByRole("button", { name: "Retry" }))

    expect(await libraryEntries()).not.toHaveLength(0)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("narrows the list to one kind when its chip is pressed, counting Liked Songs as a playlist", async () => {
    renderLibrary()
    await screen.findByRole("list")

    await userEvent.click(screen.getByRole("button", { name: "Playlists" }))

    expect(screen.getByRole("button", { name: "Playlists" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    const playlistTexts = await entryTexts()
    expect(playlistTexts).toHaveLength(1 + fakePlaylists.length)
    expect(playlistTexts).toContain("Liked SongsPlaylist · 57 songs")
    expect(playlistTexts.every((text) => text.includes("Playlist · "))).toBe(true)
  })

  it("shows every entry again when the active chip is pressed a second time", async () => {
    renderLibrary()
    const allEntries = await libraryEntries()
    const albumsChip = screen.getByRole("button", { name: "Albums" })

    await userEvent.click(albumsChip)
    expect(await libraryEntries()).toHaveLength(fakeSavedAlbums.length)
    await userEvent.click(albumsChip)

    expect(albumsChip).toHaveAttribute("aria-pressed", "false")
    expect(await libraryEntries()).toHaveLength(allEntries.length)
  })

  it("filters entries by name, ignoring case", async () => {
    renderLibrary()
    await screen.findByRole("list")

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "SLOW")

    expect(await entryTexts()).toEqual(["Slow ScienceShow"])
  })

  it("applies the kind and name filters together", async () => {
    renderLibrary()
    await screen.findByRole("list")

    await userEvent.click(screen.getByRole("button", { name: "Playlists" }))
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "in")

    expect(await entryTexts()).toEqual([
      "Morning CoffeePlaylist · Mira Kaelin",
      "Indie FindsPlaylist · Fern Radio",
    ])
  })

  it("says nothing matches when the filters exclude every entry", async () => {
    renderLibrary()
    await screen.findByRole("list")

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "zzz")

    expect(screen.getByText("Nothing in your library matches these filters.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })
})
