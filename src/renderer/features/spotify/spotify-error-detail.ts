import { Match } from "effect"
import { describeErrorCause } from "./describe-error-cause"
import type { SpotifyApiError } from "./spotify-api"

export const spotifyErrorDetail: (error: SpotifyApiError) => string =
  Match.typeTags<SpotifyApiError>()({
    SpotifyResponseError: ({ status, message }) => `Spotify answered ${status}: ${message}`,
    SpotifyAccessDenied: ({ message }) => `Spotify answered 403: ${message}`,
    SpotifyDecodeError: () => "Spotify sent a response the app couldn't read.",
    SpotifyRequestError: ({ cause }) => `Network error: ${describeErrorCause(cause)}`,
    AccessTokenUnavailable: ({ message }) => message,
    DesktopBridgeError: () => "Couldn't reach the desktop app process.",
    NotLoggedIn: () => "You're not logged in to Spotify.",
    SessionExpired: () => "Your Spotify session expired.",
    NoActiveDevice: () => "No active Spotify device.",
  })
