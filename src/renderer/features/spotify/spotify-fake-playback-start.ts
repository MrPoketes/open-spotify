import { Option, Schema } from "effect"
import type { HttpClientRequest } from "effect/http"
import { fakeTracks } from "./spotify-fake-tracks"
import { fakePlaylists, fakeShows } from "./spotify-fixtures"

const hasUri = Schema.is(Schema.Struct({ uri: Schema.String }))

const PlaybackStartBody = Schema.fromJsonString(
  Schema.Struct({
    context_uri: Schema.optionalKey(Schema.String),
    uris: Schema.optionalKey(Schema.Array(Schema.String)),
    offset: Schema.optionalKey(
      Schema.Union([
        Schema.Struct({ position: Schema.Number }),
        Schema.Struct({ uri: Schema.String }),
      ]),
    ),
  }),
)

type PlaybackStartBody = typeof PlaybackStartBody.Type

const contextItemsByKind: Record<string, (id: string) => ReadonlyArray<unknown> | undefined> = {
  playlist: (id) =>
    fakePlaylists.find((playlist) => playlist.id === id)?.entries.map(({ item }) => item),
  album: (id) => fakeTracks.filter((track) => track.album.id === id),
  artist: (id) => fakeTracks.filter((track) => track.artists.some((artist) => artist.id === id)),
  show: (id) => fakeShows.find((show) => show.id === id)?.episodes,
}

// The items a context plays through, in order, if the fixtures have it.
const contextItems = (contextUri: string) => {
  const [, kind = "", id = ""] = contextUri.split(":")
  return contextItemsByKind[kind]?.(id)
}

const listedTracks = (uris: ReadonlyArray<string>) => {
  const tracks = uris.map((uri) => fakeTracks.find((track) => track.uri === uri))
  return tracks.every((track) => track !== undefined) ? tracks : undefined
}

const startPosition = (items: ReadonlyArray<unknown>, offset: PlaybackStartBody["offset"]) => {
  if (offset === undefined) {
    return 0
  }
  const position =
    "position" in offset
      ? offset.position
      : items.findIndex((item) => hasUri(item) && item.uri === offset.uri)
  return position >= 0 && position < items.length ? position : undefined
}

interface FakePlaybackStart {
  readonly context: { readonly uri: string } | null
  readonly items: ReadonlyArray<unknown>
  readonly position: number
}

// What a request to start playback asks the fake to play, or none when
// Spotify would refuse it: an unknown context or track, or an offset outside
// what it plays.
export const fakePlaybackStart = (
  request: HttpClientRequest.HttpClientRequest,
): Option.Option<FakePlaybackStart> => {
  if (request.body._tag !== "Uint8Array") {
    return Option.none()
  }
  return Schema.decodeUnknownOption(PlaybackStartBody)(
    new TextDecoder().decode(request.body.body),
  ).pipe(
    Option.flatMap(({ context_uri, uris, offset }) => {
      const items = context_uri === undefined ? listedTracks(uris ?? []) : contextItems(context_uri)
      const position = items === undefined ? undefined : startPosition(items, offset)
      if (items === undefined || position === undefined) {
        return Option.none()
      }
      const context = context_uri === undefined ? null : { uri: context_uri }
      return Option.some({ context, items, position })
    }),
  )
}
