import type { SpotifyApiError } from "../spotify/spotify-api"

type LoginDestination =
  | { readonly to: "/login" }
  | { readonly to: "/login"; readonly search: { readonly sessionExpired: true } }

// Maps an auth error that Retry cannot fix to the login route that recovers
// from it, so route guards and failed Spotify loads share one mapping.
export const loginDestinationFor = (error: SpotifyApiError): LoginDestination | null => {
  if (error._tag === "NotLoggedIn") {
    return { to: "/login" }
  }
  if (error._tag === "SessionExpired") {
    return { to: "/login", search: { sessionExpired: true } }
  }
  return null
}
