import { Effect, Schema } from "effect"

// Puts the failures the renderer can act on into an IpcReply. Any other
// failure still rejects the invoke. The operation replies with data that is
// already encoded, so only the failure is encoded here.
export const replyWithTaggedFailures =
  <Failure extends Schema.Top>(failure: Failure) =>
  <A, E, R>(operation: Effect.Effect<A, E, R>) =>
    operation.pipe(
      Effect.map((value) => ({ _tag: "IpcSucceeded", value }) as const),
      Effect.catchIf(Schema.is(failure), (error) =>
        Schema.encodeEffect(failure)(error).pipe(
          Effect.map((encodedError) => ({ _tag: "IpcFailed", error: encodedError }) as const),
        ),
      ),
    )
