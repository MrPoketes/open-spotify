import type { SpotifyApiError } from "./spotify-api"

// Spotify answers 400 for an id that cannot be the kind it was asked for, and
// 404 for one that belongs to nothing.
export const isUnknownSpotifyId = (error: SpotifyApiError) =>
  error._tag === "SpotifyResponseError" && (error.status === 400 || error.status === 404)
