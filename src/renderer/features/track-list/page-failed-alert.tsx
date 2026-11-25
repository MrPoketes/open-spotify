import type { SpotifyApiError } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"

interface PageFailedAlertProps {
  readonly error: SpotifyApiError
  readonly onRetry: () => void
}

// Below the list and stuck to the bottom of the view, so it shows wherever the
// user has scrolled without moving any row.
export function PageFailedAlert({ error, onRetry }: PageFailedAlertProps) {
  return (
    <div className="sticky bottom-0 bg-surface py-2">
      <SpotifyLoadFailure error={error} message="Some tracks didn't load." onRetry={onRetry} />
    </div>
  )
}
