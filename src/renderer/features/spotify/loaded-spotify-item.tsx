import type { Effect } from "effect"
import type { ReactNode } from "react"
import { useLoad } from "../../lib/use-load"
import { LoadingMessage } from "../../ui/loading-message"
import { isUnknownSpotifyId } from "./is-unknown-spotify-id"
import type { SpotifyApi, SpotifyApiError } from "./spotify-api"
import type { SpotifyItemKind } from "./spotify-item-kinds"
import { SpotifyItemNotFound } from "./spotify-item-not-found"
import { SpotifyLoadFailure } from "./spotify-load-failure"

interface LoadedSpotifyItemProps<A> {
  readonly kind: SpotifyItemKind
  readonly load: Effect.Effect<A, SpotifyApiError, SpotifyApi>
  readonly children: (value: A) => ReactNode
}

export function LoadedSpotifyItem<A>({ kind, load, children }: LoadedSpotifyItemProps<A>) {
  const { state, retry } = useLoad(load, `The ${kind} failed to load`)

  if (state.status === "loading") {
    return <LoadingMessage>{`Loading ${kind}…`}</LoadingMessage>
  }
  if (state.status === "failed" && isUnknownSpotifyId(state.error)) {
    return <SpotifyItemNotFound kind={kind} />
  }
  if (state.status === "failed") {
    return (
      <SpotifyLoadFailure
        error={state.error}
        message={`This ${kind} didn't load.`}
        onRetry={retry}
      />
    )
  }
  return children(state.value)
}
