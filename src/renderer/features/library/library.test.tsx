import { act, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import type { Layer } from "effect"
import { Effect, Stream } from "effect"
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
  SpotifyApi.layerFakeWith(() => ({ savedShows: Stream.fail(error) }))

const libraryEntries = async () =>
  (await screen.findAllByRole("list")).flatMap((list) => within(list).getAllByRole("listitem"))

const kindChip = (name: string) =>
  within(screen.getByRole("group", { name: "Filter by kind" })).getByRole("button", { name })

const entryTexts = async () => (await libraryEntries()).map(({ textContent }) => textContent)

describe("Library", () => {
  it("says the library is loading until it arrives", async () => {
    renderLibrary()

    expect(await screen.findByRole("status")).toHaveTextContent("Loading your library")
    await screen.findAllByRole("list")
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
        "Liked SongsPlaylist · 5,000 songs",
        "Road Trip with SamPlaylist · Sam Okafor",
        "Small HoursAlbum · Lena Varga",
        "Velvet ChoirArtist",
        "Slow ScienceShow",
      ]),
    )
  })

  it("links Liked Songs to the Liked Songs page", async () => {
    renderLibrary()

    const likedSongsLink = await screen.findByRole("link", { name: /^Liked Songs/ })

    expect(likedSongsLink).toHaveAttribute("href", "/collection/tracks")
  })

  it("links a playlist to its playlist page", async () => {
    renderLibrary()

    const playlistLink = await screen.findByRole("link", { name: /^Road Trip with Sam/ })

    expect(playlistLink).toHaveAttribute("href", "/playlist/fake-playlist-road-trip")
  })

  it("links a saved album to its album page", async () => {
    renderLibrary()

    const albumLink = await screen.findByRole("link", { name: /^Small Hours/ })

    expect(albumLink).toHaveAttribute("href", "/album/fake-album-1")
  })

  it("links a followed artist to its artist page", async () => {
    renderLibrary()

    const artistLink = await screen.findByRole("link", { name: /^Velvet Choir/ })

    expect(artistLink).toHaveAttribute("href", "/artist/fake-artist-6")
  })

  it("links a saved show to its show page", async () => {
    renderLibrary()

    const showLink = await screen.findByRole("link", { name: /Slow Science/ })

    expect(showLink).toHaveAttribute("href", "/show/fake-show-slow-science")
  })

  // The sidebar holds every saved item, so Tab must not walk through each one.
  it("keeps each section's entries to one tab stop that the arrow keys move within", async () => {
    renderLibrary()
    const playlists = within(await screen.findByRole("region", { name: "Playlists" }))
    const [firstPlaylist, secondPlaylist] = playlists.getAllByRole("link")
    const playlistsOptions = playlists.getByRole("button", { name: "Playlists section options" })

    act(() => playlistsOptions.focus())
    await userEvent.tab()
    expect(firstPlaylist).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(secondPlaylist).toHaveFocus()
    await userEvent.tab()

    expect(
      within(screen.getByRole("region", { name: "Albums" })).getByRole("button", {
        name: "Albums",
      }),
    ).toHaveFocus()
  })

  // A section remembers its last focused entry, and a filter can leave fewer
  // entries than that, which would take the section out of the tab order.
  it("keeps a section's entries reachable with Tab after a filter shortens it", async () => {
    renderLibrary()
    const playlistsOptions = await screen.findByRole("button", {
      name: "Playlists section options",
    })

    act(() => playlistsOptions.focus())
    await userEvent.tab()
    await userEvent.keyboard("{End}")
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "road")
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()

    expect(screen.getByRole("link", { name: /^Road Trip with Sam/ })).toHaveFocus()
  })

  it("explains where entries come from when the library is empty", async () => {
    renderLibrary(
      SpotifyApi.layerFakeWith(() => ({
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
    renderLibrary(
      SpotifyApi.layerFakeWith((spotify) => ({ savedShows: failingOnce(spotify.savedShows) })),
    )

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
    await screen.findAllByRole("list")

    await userEvent.click(kindChip("Playlists"))

    expect(kindChip("Playlists")).toHaveAttribute("aria-pressed", "true")
    const playlistTexts = await entryTexts()
    expect(playlistTexts).toHaveLength(1 + fakePlaylists.length)
    expect(playlistTexts).toContain("Liked SongsPlaylist · 5,000 songs")
    expect(playlistTexts.every((text) => text.includes("Playlist · "))).toBe(true)
  })

  it("shows every entry again when the active chip is pressed a second time", async () => {
    renderLibrary()
    const allEntries = await libraryEntries()
    const albumsChip = kindChip("Albums")

    await userEvent.click(albumsChip)
    expect(await libraryEntries()).toHaveLength(fakeSavedAlbums.length)
    await userEvent.click(albumsChip)

    expect(albumsChip).toHaveAttribute("aria-pressed", "false")
    expect(await libraryEntries()).toHaveLength(allEntries.length)
  })

  it("filters entries by name, ignoring case and surrounding spaces", async () => {
    renderLibrary()
    await screen.findAllByRole("list")

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), " SLOW ")

    expect(await entryTexts()).toEqual(["Slow ScienceShow"])
  })

  it("applies the kind and name filters together", async () => {
    renderLibrary()
    await screen.findAllByRole("list")

    await userEvent.click(kindChip("Playlists"))
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "in")

    expect(await entryTexts()).toEqual([
      "Morning CoffeePlaylist · Mira Kaelin",
      "Indie FindsPlaylist · Fern Radio",
    ])
  })

  it("says nothing matches when the filters exclude every entry", async () => {
    renderLibrary()
    await screen.findAllByRole("list")

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "zzz")

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nothing in your library matches these filters.",
    )
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })
})
