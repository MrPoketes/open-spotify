import type { ReactNode } from "react"
import type { LoadState } from "../../lib/use-load"
import { LoadingMessage } from "../../ui/loading-message"
import type { SpotifyApiError } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"

interface LoadedContentProps<A> {
  readonly state: LoadState<A, SpotifyApiError>
  readonly loadingMessage: string
  readonly failureMessage: string
  readonly onRetry: () => void
  readonly children: (value: A) => ReactNode
}

// What a section shows while it loads, when it fails, and once it has loaded.
export function LoadedContent<A>({
  state,
  loadingMessage,
  failureMessage,
  onRetry,
  children,
}: LoadedContentProps<A>) {
  if (state.status === "loading") {
    return <LoadingMessage>{loadingMessage}</LoadingMessage>
  }
  if (state.status === "failed") {
    return <SpotifyLoadFailure error={state.error} message={failureMessage} onRetry={onRetry} />
  }
  return children(state.value)
}
