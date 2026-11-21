import { Effect, Stream } from "effect"
import { useState } from "react"
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

// Loads once when the component mounts. retry loads again from the start,
// showing the loading state meanwhile.
export function useLoad<A, E>(
  load: Effect.Effect<A, E, RendererServices>,
  failureMessage: string,
): ReplaceableLoad<A, E> {
  const [loadStream, setLoadStream] = useState(() => loadOnce(load, failureMessage))
  const state = useStreamValue(loadStream, { status: "loading" } as const)
  return {
    state,
    retry: () => setLoadStream(loadOnce(load, failureMessage)),
    replace: (value) => setLoadStream(Stream.succeed<LoadState<A, E>>({ status: "loaded", value })),
  }
}
