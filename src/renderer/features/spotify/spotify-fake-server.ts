import { Effect, Layer } from "effect"
import { HttpClient, type HttpClientRequest, HttpClientResponse } from "effect/http"
import { SpotifyAccessToken } from "./spotify-access-token"
import {
  type FakePlaylist,
  fakeCurrentUser,
  fakeListenerId,
  fakePlaylists,
} from "./spotify-fixtures"

const fakeAccessToken = "fake-access-token"

// Spotify embeds at most this many items in a full playlist object.
const embeddedItemLimit = 100

const jsonResponse = (
  request: HttpClientRequest.HttpClientRequest,
  status: number,
  body: unknown,
) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
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

const listenerCanReadItems = (playlist: FakePlaylist) =>
  playlist.owner.id === fakeListenerId || playlist.collaborative

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
      playlist.entries,
      new URL(`${url.origin}${url.pathname}/items`),
      embeddedItemLimit,
    ),
  }
}

const notFound = [404, errorBody(404, "Resource not found")] as const

const respondTo = (url: URL): readonly [number, unknown] => {
  if (url.pathname === "/v1/me") {
    return [200, fakeCurrentUser]
  }
  if (url.pathname === "/v1/me/playlists") {
    return [200, pageOf(fakePlaylists.map(simplifiedPlaylist), url, 20)]
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
  return [200, pageOf(playlist.entries, url, 20)]
}

// A stand-in for api.spotify.com that serves the fixtures, so features can be
// built and tested without logging in.
export const spotifyFakeServer = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request, url) => {
    if (request.headers["authorization"] !== `Bearer ${fakeAccessToken}`) {
      return Effect.succeed(jsonResponse(request, 401, errorBody(401, "No token provided")))
    }
    const [status, body] = respondTo(url)
    return Effect.succeed(jsonResponse(request, status, body))
  }),
)

export const spotifyFakeAccessToken = Layer.succeed(SpotifyAccessToken, {
  get: Effect.succeed(fakeAccessToken),
})
