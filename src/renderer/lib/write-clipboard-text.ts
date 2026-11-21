import { Effect, Schema } from "effect"

class ClipboardWriteError extends Schema.TaggedError<ClipboardWriteError>()("ClipboardWriteError", {
  cause: Schema.Defect(),
}) {}

// Chromium refuses clipboard writes while the window is not focused.
export const writeClipboardText = (text: string) =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: (cause) => new ClipboardWriteError({ cause }),
  })
