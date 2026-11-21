import { Schema } from "effect"

// A rejected invoke reaches the renderer as a plain Error that keeps only its
// message. A channel whose failures the renderer must tell apart replies with
// this envelope instead, and still rejects on failures nobody can act on.
export const IpcReply = <Value extends Schema.Top, Failure extends Schema.Top>(
  value: Value,
  failure: Failure,
) =>
  Schema.Union([
    Schema.TaggedStruct("IpcSucceeded", { value }),
    Schema.TaggedStruct("IpcFailed", { error: failure }),
  ])
