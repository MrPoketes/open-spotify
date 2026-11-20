import { Effect, Schema } from "effect"
import { use, useState } from "react"
import { RendererRuntimeContext } from "../lib/renderer-runtime"

class ClipboardWriteError extends Schema.TaggedError<ClipboardWriteError>()("ClipboardWriteError", {
  cause: Schema.Defect(),
}) {}

export function CopyButton({ text, subject }: { readonly text: string; readonly subject: string }) {
  const runtime = use(RendererRuntimeContext)
  const [isCopied, setIsCopied] = useState(false)

  const copy = () => {
    runtime.runFork(
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(text),
        catch: (cause) => new ClipboardWriteError({ cause }),
      }).pipe(
        Effect.andThen(Effect.sync(() => setIsCopied(true))),
        Effect.catchTag("ClipboardWriteError", (error) =>
          Effect.logWarning(`Could not copy the ${subject}`, error),
        ),
      ),
    )
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={isCopied ? `Copied ${subject}` : `Copy ${subject}`}
      className="rounded-small bg-surface-overlay px-3 py-1 text-sm font-semibold"
    >
      {isCopied ? "Copied" : "Copy"}
    </button>
  )
}
