import { Match } from "effect"
import { describeErrorCause } from "./describe-error-cause"
import type { SpotifyApiError } from "./spotify-api"

const responseErrorDetail = (status: number, message: string): string => {
  if (message === `Spotify responded with HTTP ${status}`) {
    return `Spotify answered with HTTP ${status}.`
  }
  return `Spotify answered ${status}: ${message}`
}

const requestErrorDetail = (cause: unknown): string => {
  const summary = describeErrorCause(cause)
  return summary === "" ? "Couldn't reach Spotify." : `Network error: ${summary}`
}

export const spotifyErrorDetail: (error: SpotifyApiError) => string =
  Match.typeTags<SpotifyApiError>()({
    SpotifyResponseError: ({ status, message }) => responseErrorDetail(status, message),
    SpotifyAccessDenied: ({ message }) => `Spotify answered 403: ${message}`,
    SpotifyDecodeError: () => "Spotify sent a response the app couldn't read.",
    SpotifyRequestError: ({ cause }) => requestErrorDetail(cause),
    AccessTokenUnavailable: ({ message }) => message,
    DesktopBridgeError: () => "Couldn't reach the desktop app process.",
    NotLoggedIn: () => "You're not logged in to Spotify.",
    SessionExpired: () => "Your Spotify session expired.",
    NoActiveDevice: () => "No active Spotify device.",
  })
