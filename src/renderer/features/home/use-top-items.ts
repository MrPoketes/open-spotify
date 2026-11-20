import type { Effect } from "effect"
import { useState } from "react"
import type { RendererServices } from "../../lib/renderer-runtime"
import { type LoadState, loadOnce } from "../../lib/use-load"
import { useStreamValue } from "../../lib/use-stream-value"
import type { SpotifyApiError } from "../spotify/spotify-api"
import type { TimeRange } from "../spotify/spotify-listening-history"

const defaultTimeRange: TimeRange = "medium_term"

export interface TopItems<A> {
  readonly timeRange: TimeRange
  readonly state: LoadState<ReadonlyArray<A>, SpotifyApiError>
  readonly showTimeRange: (timeRange: TimeRange) => void
  readonly retry: () => void
}

// The user's top artists or tracks over the chosen time range, loaded again
// whenever the time range changes.
export function useTopItems<A>(
  loadTopItems: (
    timeRange: TimeRange,
  ) => Effect.Effect<ReadonlyArray<A>, SpotifyApiError, RendererServices>,
  failureMessage: string,
): TopItems<A> {
  const startLoad = (timeRange: TimeRange) => ({
    timeRange,
    states: loadOnce(loadTopItems(timeRange), failureMessage),
  })
  const [load, setLoad] = useState(() => startLoad(defaultTimeRange))
  const state = useStreamValue(load.states, { status: "loading" } as const)
  const showTimeRange = (timeRange: TimeRange) => setLoad(startLoad(timeRange))
  return {
    timeRange: load.timeRange,
    state,
    showTimeRange,
    retry: () => showTimeRange(load.timeRange),
  }
}

// A section is hidden when it has nothing to show by default. Once the user
// picks another time range it stays, so the switch to go back stays too.
export const hasNoTopItems = ({ timeRange, state }: TopItems<unknown>) =>
  timeRange === defaultTimeRange && state.status === "loaded" && state.value.length === 0
