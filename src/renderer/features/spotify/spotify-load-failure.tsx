import { Navigate } from "@tanstack/react-router"
import type { Ref } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { loginDestinationFor } from "../login/login-destination"
import type { SpotifyAccessDenied, SpotifyApiError } from "./spotify-api"
import { SpotifyDashboardLink } from "./spotify-dashboard-link"
import { spotifyErrorDetail } from "./spotify-error-detail"

interface SpotifyAccessDeniedNoticeProps {
  readonly error: SpotifyAccessDenied
  readonly message: string
}

export function SpotifyAccessDeniedNotice({ error, message }: SpotifyAccessDeniedNoticeProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-sm">
      <p>{message}</p>
      <p className="text-xs text-muted">
        {error.denial === "userNotRegistered" ? (
          <>
            This Spotify account isn&apos;t added under User Management in the{" "}
            <SpotifyDashboardLink />. Add your account there, then log in again.
          </>
        ) : (
          <>
            Spotify requires an active Premium subscription for development-mode apps. Check your
            app in the <SpotifyDashboardLink />.
          </>
        )}
      </p>
      <p className="text-xs text-muted">{spotifyErrorDetail(error)}</p>
    </div>
  )
}

interface SpotifyLoadFailureProps {
  readonly error: SpotifyApiError
  readonly message: string
  readonly onRetry: () => void
  readonly retryRef?: Ref<HTMLButtonElement>
}

// Retry cannot bring back a session or fix a dashboard/Premium 403.
export function SpotifyLoadFailure({ error, ...retryProps }: SpotifyLoadFailureProps) {
  const destination = loginDestinationFor(error)
  if (destination !== null) {
    return <Navigate {...destination} />
  }
  if (error._tag === "SpotifyAccessDenied") {
    return <SpotifyAccessDeniedNotice error={error} message={retryProps.message} />
  }
  return <ErrorWithRetry {...retryProps} detail={spotifyErrorDetail(error)} />
}
