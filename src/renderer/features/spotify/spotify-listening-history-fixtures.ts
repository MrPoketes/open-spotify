import { fakeFollowedArtists, fakeTrack } from "./spotify-fixtures"
import type { TimeRange } from "./spotify-listening-history"

const play = (trackIndex: number, contextUri: string | null) => ({
  track: fakeTrack(trackIndex),
  context: contextUri === null ? null : { type: contextUri.split(":")[1], uri: contextUri },
})

// Newest first. Glass Harbour is played from several times, the first track
// twice in a row, some plays have contexts that are not albums, playlists,
// or artists (Liked Songs, or nothing at all), and nine pages were played
// from, one more than Jump back in shows.
export const fakeRecentlyPlayed = [
  play(0, "spotify:album:fake-album-0"),
  play(0, "spotify:album:fake-album-0"),
  play(1, "spotify:playlist:fake-playlist-late-night-drive"),
  play(6, "spotify:album:fake-album-0"),
  play(2, "spotify:artist:fake-artist-1"),
  play(3, "spotify:user:fake-listener:collection"),
  play(4, null),
  play(5, "spotify:playlist:fake-playlist-big-archive"),
  play(8, "spotify:album:fake-album-2"),
  play(9, "spotify:playlist:fake-playlist-morning-coffee"),
  play(10, "spotify:artist:fake-artist-3"),
  play(0, "spotify:album:fake-album-0"),
  play(16, "spotify:album:fake-album-4"),
  play(11, "spotify:playlist:fake-playlist-road-trip"),
]

const artistsAt = (indexes: ReadonlyArray<number>) =>
  indexes.flatMap((index) => fakeFollowedArtists.slice(index, index + 1))

const tracksAt = (indexes: ReadonlyArray<number>) => indexes.map(fakeTrack)

export const fakeTopArtists: Record<TimeRange, ReturnType<typeof artistsAt>> = {
  short_term: artistsAt([4, 9, 1]),
  medium_term: artistsAt([1, 0, 3, 12, 20]),
  long_term: artistsAt([0, 2, 5, 30]),
}

export const fakeTopTracks: Record<TimeRange, ReturnType<typeof tracksAt>> = {
  short_term: tracksAt([40, 41, 42]),
  medium_term: tracksAt([1, 0, 6, 2, 9]),
  long_term: tracksAt([60, 61, 62, 63]),
}
