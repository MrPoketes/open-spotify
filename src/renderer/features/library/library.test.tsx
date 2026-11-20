import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Layer, Stream } from "effect"
import { describe, expect, it } from "vitest"
import {
  AccessTokenUnavailable,
  NotLoggedIn,
  SessionExpired,
} from "../../../shared/spotify-auth-replies"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
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

const renderLibrary = (spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(<Library />, fakeMainProcess(), spotifyApi)

const failingWith = (error: SpotifyApiError) =>
  spotifyApiWith(() => ({ savedShows: Stream.fail(error) }))

const libraryEntries = async () => within(await screen.findByRole("list")).getAllByRole("listitem")

const entryTexts = async () => (await libraryEntries()).map(({ textContent }) => textContent)

describe("Library", () => {
  it("says the library is loading until it arrives", async () => {
    renderLibrary()

    expect(await screen.findByRole("status")).toHaveTextContent("Loading your library")
    await screen.findByRole("list")
    expect(screen.queryByText("Loading your library…")).not.toBeInTheDocument()
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

  it("goes to the login screen, saying why, when the session has expired", async () => {
    const router = renderLibrary(failingWith(new SessionExpired()))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })

  it("goes to the login screen when the user is not logged in", async () => {
    const router = renderLibrary(failingWith(new NotLoggedIn()))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({})
  })

  // The main process keeps the session when Spotify is briefly unreachable,
  // so logging in again would not help and Retry can.
  it("offers Retry instead of login when Spotify cannot refresh the session right now", async () => {
    const router = renderLibrary(
      failingWith(new AccessTokenUnavailable({ message: "Spotify is unreachable" })),
    )

    const failure = await screen.findByRole("alert")
    expect(within(failure).getByRole("button", { name: "Retry" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/screen")
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

  it("filters entries by name, ignoring case and surrounding spaces", async () => {
    renderLibrary()
    await screen.findByRole("list")

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), " SLOW ")

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

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nothing in your library matches these filters.",
    )
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })
})
