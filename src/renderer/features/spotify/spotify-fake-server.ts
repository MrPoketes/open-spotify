import { Effect, Layer } from "effect"
import { HttpClient, type HttpClientRequest, HttpClientResponse } from "effect/http"
import { SpotifyAccessToken } from "./spotify-access-token"
import type { AlbumGroup } from "./spotify-api"
import { fakeDiscography } from "./spotify-discography-fixtures"
import { fakePlayer } from "./spotify-fake-player"
import { searchPageSize } from "./spotify-search"
import {
  type FakePlaylist,
  fakeAlbums,
  fakeCurrentUser,
  fakeEpisode,
  fakeFollowedArtists,
  fakeLikedSongs,
  fakeListenerId,
  fakePlaylists,
  fakeSavedAlbums,
  fakeSavedShows,
  fakeShows,
} from "./spotify-fixtures"

export const fakeAccessToken = "fake-access-token"

// Spotify embeds at most this many items in a full playlist object.
const embeddedItemLimit = 100

// Spotify embeds at most this many tracks in a full album object.
const embeddedAlbumTrackLimit = 50

// The page size Spotify uses when a request has no limit parameter.
const defaultPageLimit = 20

// The page size Spotify uses for an artist's albums when a request has no
// limit parameter.
const defaultArtistAlbumsLimit = 5

// A 204 response must not carry a body, not even "null".
const jsonResponse = (
  request: HttpClientRequest.HttpClientRequest,
  status: number,
  body: unknown,
) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  )

const errorBody = (status: number, message: string) => ({ error: { status, message } })

const pageOf = <A>(items: ReadonlyArray<A>, url: URL, defaultLimit: number) => {
  const limit = Number(url.searchParams.get("limit") ?? defaultLimit)
  const offset = Number(url.searchParams.get("offset") ?? 0)
  const nextUrl = new URL(url)
  nextUrl.searchParams.set("offset", String(offset + limit))
  return {
    href: url.href,
    items: items.slice(offset, offset + limit),
    limit,
    offset,
    total: items.length,
    next: offset + limit < items.length ? nextUrl.href : null,
    previous: null,
  }
}

const urlWithCursor = (url: URL, cursor: string) => {
  const nextUrl = new URL(url)
  nextUrl.searchParams.set("after", cursor)
  return nextUrl.href
}

// Followed artists are paged by cursor: `after` is the id of the last artist
// on the previous page.
const cursorPageOf = (artists: typeof fakeFollowedArtists, url: URL) => {
  const limit = Number(url.searchParams.get("limit") ?? defaultPageLimit)
  const after = url.searchParams.get("after")
  const start = artists.findIndex(({ id }) => id === after) + 1
  const items = artists.slice(start, start + limit)
  const nextCursor = start + limit < artists.length ? (items.at(-1)?.id ?? null) : null
  return {
    href: url.href,
    items,
    limit,
    total: artists.length,
    next: nextCursor === null ? null : urlWithCursor(url, nextCursor),
    cursors: { after: nextCursor, before: null },
  }
}

const listenerCanReadItems = (playlist: FakePlaylist) =>
  playlist.owner.id === fakeListenerId || playlist.collaborative

// Spotify returns episodes only to clients that list them in
// additional_types. The fake leaves them out as null items.
const entriesServed = (playlist: FakePlaylist, url: URL) => {
  const itemTypes = url.searchParams.get("additional_types") ?? "track"
  if (itemTypes.split(",").includes("episode")) {
    return playlist.entries
  }
  return playlist.entries.map((entry) =>
    entry.item === fakeEpisode ? { ...entry, item: null } : entry,
  )
}

const playlistMetadata = (playlist: FakePlaylist) => ({
  id: playlist.id,
  name: playlist.name,
  description: playlist.description,
  images: playlist.images,
  owner: playlist.owner,
  collaborative: playlist.collaborative,
  type: "playlist",
  uri: `spotify:playlist:${playlist.id}`,
})

const simplifiedPlaylist = (playlist: FakePlaylist) => ({
  ...playlistMetadata(playlist),
  items: { href: "", total: playlist.entries.length },
})

const fullPlaylist = (playlist: FakePlaylist, url: URL) => {
  if (!listenerCanReadItems(playlist)) {
    return playlistMetadata(playlist)
  }
  return {
    ...playlistMetadata(playlist),
    items: pageOf(
      entriesServed(playlist, url),
      new URL(`${url.origin}${url.pathname}/items${url.search}`),
      embeddedItemLimit,
    ),
  }
}

const notFound = [404, errorBody(404, "Resource not found")] as const

const respondToShow = (url: URL): readonly [number, unknown] => {
  const [, showId, episodesPath] = /^\/v1\/shows\/([^/]+)(\/episodes)?$/.exec(url.pathname) ?? []
  const show = fakeShows.find(({ id }) => id === showId)
  if (!show) {
    return notFound
  }
  if (episodesPath === undefined) {
    const { episodes, ...showMetadata } = show
    return [200, { ...showMetadata, total_episodes: episodes.length }]
  }
  return [200, pageOf(show.episodes, url, defaultPageLimit)]
}

const respondToAlbum = (url: URL): readonly [number, unknown] => {
  const [, albumId, tracksPath] = /^\/v1\/albums\/([^/]+)(\/tracks)?$/.exec(url.pathname) ?? []
  const album = fakeAlbums.find(({ id }) => id === albumId)
  if (!album) {
    return notFound
  }
  if (tracksPath !== undefined) {
    return [200, pageOf(album.tracks, url, defaultPageLimit)]
  }
  const tracksUrl = new URL(`${url.origin}${url.pathname}/tracks`)
  return [200, { ...album, tracks: pageOf(album.tracks, tracksUrl, embeddedAlbumTrackLimit) }]
}

const albumGroups: ReadonlyArray<AlbumGroup> = ["album", "single", "appears_on"]

// An artist's albums are filtered by the comma-separated include_groups.
const respondToArtist = (url: URL): readonly [number, unknown] => {
  const [, artistId, albumsPath] = /^\/v1\/artists\/([^/]+)(\/albums)?$/.exec(url.pathname) ?? []
  const artist = fakeFollowedArtists.find(({ id }) => id === artistId)
  if (!artist) {
    return notFound
  }
  if (albumsPath === undefined) {
    return [200, artist]
  }
  const discography = fakeDiscography(artist.id)
  const requestedGroups = (url.searchParams.get("include_groups") ?? "").split(",")
  const albums = albumGroups
    .filter((albumGroup) => requestedGroups.includes(albumGroup))
    .flatMap((albumGroup) => discography[albumGroup])
  return [200, pageOf(albums, url, defaultArtistAlbumsLimit)]
}

// The page size Spotify uses for search results when a request has no limit
// parameter.
const defaultSearchLimit = 5

const nameMatches = (query: string) => (result: { readonly name: string } | null) =>
  result !== null && result.name.toLowerCase().includes(query.toLowerCase())

// Spotify sends null for a playlist it no longer serves and still counts it,
// so the fake ends every playlist search with one.
const searchableResults = (
  query: string,
): Record<string, readonly [resultsKey: string, matches: ReadonlyArray<unknown>]> => ({
  track: ["tracks", fakeLikedSongs.map(({ track }) => track).filter(nameMatches(query))],
  artist: ["artists", fakeFollowedArtists.filter(nameMatches(query))],
  album: ["albums", fakeAlbums.filter(nameMatches(query))],
  playlist: [
    "playlists",
    [...fakePlaylists.map(simplifiedPlaylist).filter(nameMatches(query)), null],
  ],
})

const respondToSearch = (url: URL): readonly [number, unknown] => {
  if (Number(url.searchParams.get("limit") ?? defaultSearchLimit) > searchPageSize) {
    return [400, errorBody(400, "Invalid limit")]
  }
  const requestedTypes = (url.searchParams.get("type") ?? "").split(",")
  const results = Object.entries(searchableResults(url.searchParams.get("q") ?? ""))
    .filter(([type]) => requestedTypes.includes(type))
    .map(([, [key, matches]]) => [key, pageOf(matches, url, defaultSearchLimit)])
  return [200, Object.fromEntries(results)]
}

const currentUserResources: Record<string, (url: URL) => unknown> = {
  "/v1/me": () => fakeCurrentUser,
  "/v1/me/playlists": (url) => pageOf(fakePlaylists.map(simplifiedPlaylist), url, defaultPageLimit),
  "/v1/me/tracks": (url) => pageOf(fakeLikedSongs, url, defaultPageLimit),
  "/v1/me/albums": (url) => pageOf(fakeSavedAlbums, url, defaultPageLimit),
  "/v1/me/shows": (url) => pageOf(fakeSavedShows, url, defaultPageLimit),
}

const resourcesByPathPrefix = [
  ["/v1/shows/", respondToShow],
  ["/v1/albums/", respondToAlbum],
  ["/v1/artists/", respondToArtist],
  ["/v1/search", respondToSearch],
] as const

const respondTo = (url: URL): readonly [number, unknown] => {
  const resource = resourcesByPathPrefix.find(([prefix]) => url.pathname.startsWith(prefix))
  if (resource) {
    const [, respond] = resource
    return respond(url)
  }
  const currentUserResource = currentUserResources[url.pathname]
  if (currentUserResource) {
    return [200, currentUserResource(url)]
  }
  if (url.pathname === "/v1/me/following") {
    return [200, { artists: cursorPageOf(fakeFollowedArtists, url) }]
  }
  const [, playlistId, itemsPath] = /^\/v1\/playlists\/([^/]+)(\/items)?$/.exec(url.pathname) ?? []
  const playlist = fakePlaylists.find(({ id }) => id === playlistId)
  if (!playlist) {
    return notFound
  }
  if (itemsPath === undefined) {
    return [200, fullPlaylist(playlist, url)]
  }
  if (!listenerCanReadItems(playlist)) {
    return [403, errorBody(403, "Forbidden")]
  }
  return [200, pageOf(entriesServed(playlist, url), url, defaultPageLimit)]
}

// A stand-in for api.spotify.com that serves the fixtures, so features can be
// built and tested without logging in.
export const spotifyFakeServer = Layer.sync(HttpClient.HttpClient, () => {
  const respondToPlayer = fakePlayer()
  return HttpClient.make((request, url) => {
    if (request.headers["authorization"] !== `Bearer ${fakeAccessToken}`) {
      return Effect.succeed(jsonResponse(request, 401, errorBody(401, "No token provided")))
    }
    const [status, body] = respondToPlayer(request, url) ?? respondTo(url)
    return Effect.succeed(jsonResponse(request, status, body))
  })
})

export const spotifyFakeAccessToken = Layer.succeed(SpotifyAccessToken, {
  get: Effect.succeed(fakeAccessToken),
})
