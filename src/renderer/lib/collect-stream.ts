import { Effect, Queue, Stream } from "effect"

// Collects what a stream emits for the rest of the test's scope. Responses
// from the fake Spotify server resolve through real promises, so a test takes
// each value from the queue instead of expecting it to arrive within a clock
// adjustment.
export const collectStream = <A>(stream: Stream.Stream<A>) =>
  Effect.gen(function* () {
    const values = yield* Queue.unbounded<A>()
    yield* Stream.runForEach(stream, (value) => Queue.offer(values, value)).pipe(Effect.forkScoped)
    return values
  })
