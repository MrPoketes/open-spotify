import { Effect, Stream } from "effect"
import { useState } from "react"
import type { RendererServices } from "./renderer-runtime"
import { useStreamValue } from "./use-stream-value"

export type LoadState<A, E> =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly value: A }
  | { readonly status: "failed"; readonly error: E }

const loadOnce = <A, E>(load: Effect.Effect<A, E, RendererServices>, failureMessage: string) =>
  Stream.fromEffect(
    load.pipe(
      Effect.tapError((error) => Effect.logError(failureMessage, error)),
      Effect.match({
        onFailure: (error): LoadState<A, E> => ({ status: "failed", error }),
        onSuccess: (value): LoadState<A, E> => ({ status: "loaded", value }),
      }),
    ),
  )

// Loads once when the component mounts. retry loads again from the start,
// showing the loading state meanwhile.
export function useLoad<A, E>(
  load: Effect.Effect<A, E, RendererServices>,
  failureMessage: string,
): { readonly state: LoadState<A, E>; readonly retry: () => void } {
  const [loading, setLoading] = useState(() => loadOnce(load, failureMessage))
  const state = useStreamValue(loading, { status: "loading" } as const)
  return { state, retry: () => setLoading(loadOnce(load, failureMessage)) }
}
