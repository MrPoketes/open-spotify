import { Schema } from "effect"
import { IpcReply } from "../shared/ipc-reply"

// IPC replies are structured-cloned, and the renderer decodes the clone with
// the shared Schema. A Schema.Never side makes decoding fail on that outcome.
export const replyAsRendererReceives = <Value, Failure>(
  value: Schema.Decoder<Value>,
  failure: Schema.Decoder<Failure>,
  reply: unknown,
) => {
  const decodedReply = Schema.decodeUnknownSync(IpcReply(value, failure))(structuredClone(reply))
  return decodedReply._tag === "IpcSucceeded" ? decodedReply.value : decodedReply.error
}
