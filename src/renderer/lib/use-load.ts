import { Effect, Stream } from "effect"
import { useCallback, useMemo, useState } from "react"
import type { RendererServices } from "./renderer-runtime"
import { useStreamValue } from "./use-stream-value"

export type LoadState<A, E> =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly value: A }
  | { readonly status: "failed"; readonly error: E }

// A stream of one load's states, for hooks that start a load in more ways than
// useLoad does.
export const loadOnce = <A, E>(
  load: Effect.Effect<A, E, RendererServices>,
  failureMessage: string,
) =>
  Stream.fromEffect(
    load.pipe(
      Effect.tapError((error) => Effect.logError(failureMessage, error)),
      Effect.match({
        onFailure: (error): LoadState<A, E> => ({ status: "failed", error }),
        onSuccess: (value): LoadState<A, E> => ({ status: "loaded", value }),
      }),
    ),
  )

export interface RetryableLoad<A, E> {
  readonly state: LoadState<A, E>
  readonly retry: () => void
}

export interface ReplaceableLoad<A, E> extends RetryableLoad<A, E> {
  // Shows a value read some other way, such as again after a change, without
  // passing through the loading state.
  readonly replace: (value: A) => void
}

const loading = { status: "loading" } as const

// Loads once when the component mounts. retry loads again from the start,
// showing the loading state meanwhile.
export function useLoad<A, E>(
  load: Effect.Effect<A, E, RendererServices>,
  failureMessage: string,
): ReplaceableLoad<A, E> {
  // A stream shows its starting state until its first value arrives, so a
  // replaced value is the starting state of a stream that adds nothing.
  const [currentLoad, setCurrentLoad] = useState<{
    readonly stream: Stream.Stream<LoadState<A, E>, never, RendererServices>
    readonly startingState: LoadState<A, E>
  }>(() => ({ stream: loadOnce(load, failureMessage), startingState: loading }))
  const state = useStreamValue(currentLoad.stream, currentLoad.startingState)
  const retry = useCallback(
    () => setCurrentLoad({ stream: loadOnce(load, failureMessage), startingState: loading }),
    [load, failureMessage],
  )
  const replace = useCallback(
    (value: A) =>
      setCurrentLoad({ stream: Stream.empty, startingState: { status: "loaded", value } }),
    [],
  )
  // Shared through context, where a new object on every render would
  // re-render every reader, such as each row of the library.
  return useMemo(() => ({ state, retry, replace }), [state, retry, replace])
}
