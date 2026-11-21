import { Schema } from "effect"

export class MalformedIpcRequest extends Schema.TaggedError<MalformedIpcRequest>()(
  "MalformedIpcRequest",
  { channel: Schema.String, cause: Schema.Defect() },
) {}
