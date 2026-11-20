import { Effect, Schema } from "effect"
import { SearchAlbum } from "./spotify-album"
import { Artist } from "./spotify-artist"
import { Paging } from "./spotify-paging"
import { SimplifiedPlaylist } from "./spotify-playlist"
import { Track } from "./spotify-track"

export type SearchType = "track" | "artist" | "album" | "playlist"

// Spotify caps a page of search results at 10 for development-mode apps and
// answers a larger limit with an error.
export const searchPageSize = 10

// Spotify can send null in place of a result it no longer serves, such as a
// removed playlist, and one missing result must not fail the whole search.
// It includes only the kinds of result the request asked for, so the other
// kinds decode as empty pages.
const searchPage = <S extends Schema.Top>(result: S) =>
  Paging(Schema.NullOr(result)).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({ items: [], next: null, total: 0 })),
  )

export const SearchResults = Schema.Struct({
  tracks: searchPage(Track),
  artists: searchPage(Artist),
  albums: searchPage(SearchAlbum),
  playlists: searchPage(SimplifiedPlaylist),
})

export type SearchResults = typeof SearchResults.Type
