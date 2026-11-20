import { Effect, Fiber, Stream } from "effect"
import { use, useEffect, useState } from "react"
import { RendererRuntimeContext, type RendererServices } from "./renderer-runtime"

// Runs the stream while the component is mounted and returns its latest value.
// Passing a different stream starts over from initialValue, so a component can
// load again by creating a new stream.
export function useStreamValue<A, Initial>(
  stream: Stream.Stream<A, never, RendererServices>,
  initialValue: Initial,
): A | Initial {
  const runtime = use(RendererRuntimeContext)
  const [latest, setLatest] = useState<{ readonly stream: typeof stream; readonly value: A }>()

  useEffect(() => {
    const subscription = runtime.runFork(
      Stream.runForEach(stream, (value) => Effect.sync(() => setLatest({ stream, value }))),
    )
    return () => {
      runtime.runFork(Fiber.interrupt(subscription))
    }
  }, [runtime, stream])

  return latest?.stream === stream ? latest.value : initialValue
}
