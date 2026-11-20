import { Navigate } from "@tanstack/react-router"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import type { SpotifyApiError } from "./spotify-api"

interface SpotifyLoadFailureProps {
  readonly error: SpotifyApiError
  readonly message: string
  readonly onRetry: () => void
}

// Retry cannot bring back a session, so these go straight to login.
export function SpotifyLoadFailure({ error, message, onRetry }: SpotifyLoadFailureProps) {
  if (error._tag === "NotLoggedIn") {
    return <Navigate to="/login" />
  }
  if (error._tag === "SessionExpired") {
    return <Navigate to="/login" search={{ sessionExpired: true }} />
  }
  return <ErrorWithRetry message={message} onRetry={onRetry} />
}
