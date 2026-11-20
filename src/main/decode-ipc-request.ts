import { Effect, Schema } from "effect"
import type { IpcChannel } from "../shared/ipc-channels"

export class MalformedIpcRequest extends Schema.TaggedError<MalformedIpcRequest>()(
  "MalformedIpcRequest",
  { channel: Schema.String, cause: Schema.Defect() },
) {}

// The renderer shows web content, so nothing it sends is trusted until it
// has been decoded.
export const decodeIpcRequest = <A>(
  channel: IpcChannel,
  schema: Schema.Decoder<A>,
  request: unknown,
) =>
  Schema.decodeUnknownEffect(schema)(request).pipe(
    Effect.mapError((cause) => new MalformedIpcRequest({ channel, cause })),
  )
