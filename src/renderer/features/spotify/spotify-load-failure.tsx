import { Navigate } from "@tanstack/react-router"
import type { Ref } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { loginDestinationFor } from "../login/login-destination"
import type { SpotifyApiError } from "./spotify-api"

interface SpotifyLoadFailureProps {
  readonly error: SpotifyApiError
  readonly message: string
  readonly onRetry: () => void
  readonly retryRef?: Ref<HTMLButtonElement>
}

// Retry cannot bring back a session, so auth failures go straight to login.
export function SpotifyLoadFailure({ error, ...retryProps }: SpotifyLoadFailureProps) {
  const destination = loginDestinationFor(error)
  if (destination !== null) {
    return <Navigate {...destination} />
  }
  return <ErrorWithRetry {...retryProps} />
}
