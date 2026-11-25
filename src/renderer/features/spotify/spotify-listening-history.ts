import { Effect, type Schema } from "effect"
import { spotifyApiBaseUrl } from "./spotify-api-url"
import { Artist } from "./spotify-artist"
import { Paging } from "./spotify-paging"
import { RecentlyPlayedPage } from "./spotify-play-history"
import { Track } from "./spotify-track"

// Spotify's time_range values: about the last four weeks, the last six
// months, and the last year.
export type TimeRange = "short_term" | "medium_term" | "long_term"

// The largest page of play history Spotify returns.
const recentlyPlayedLimit = 50

// The home page shows the user's ten top artists and tracks.
const topItemsLimit = 10

// What the user has been listening to, fetched with SpotifyApi's getJson.
export const listeningHistoryRequests = <E>(
  getJson: <A>(url: string, responseSchema: Schema.Decoder<A>) => Effect.Effect<A, E>,
) => ({
  getRecentlyPlayed: getJson(
    `${spotifyApiBaseUrl}/me/player/recently-played?limit=${recentlyPlayedLimit}`,
    RecentlyPlayedPage,
  ).pipe(Effect.map(({ items }) => items)),
  getTopArtists: (timeRange: TimeRange) =>
    getJson(
      `${spotifyApiBaseUrl}/me/top/artists?time_range=${timeRange}&limit=${topItemsLimit}`,
      Paging(Artist),
    ).pipe(Effect.map(({ items }) => items)),
  getTopTracks: (timeRange: TimeRange) =>
    getJson(
      `${spotifyApiBaseUrl}/me/top/tracks?time_range=${timeRange}&limit=${topItemsLimit}`,
      Paging(Track),
    ).pipe(Effect.map(({ items }) => items)),
})
