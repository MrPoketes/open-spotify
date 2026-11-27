import { Effect } from "effect"
import { Check, Copy } from "lucide-react"
import { use, useState } from "react"
import { RendererRuntimeContext } from "../lib/renderer-runtime"
import { writeClipboardText } from "../lib/write-clipboard-text"
import { Button } from "./button"

export function CopyButton({ text, subject }: { readonly text: string; readonly subject: string }) {
  const runtime = use(RendererRuntimeContext)
  const [isCopied, setIsCopied] = useState(false)

  const copy = () => {
    runtime.runFork(
      writeClipboardText(text).pipe(
        Effect.andThen(Effect.sync(() => setIsCopied(true))),
        Effect.catchTag("ClipboardWriteError", (error) =>
          Effect.logWarning(`Could not copy the ${subject}`, error),
        ),
      ),
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={isCopied ? `Copied ${subject}` : `Copy ${subject}`}
    >
      {isCopied ? <Check aria-hidden size={14} /> : <Copy aria-hidden size={14} />}
      {isCopied ? "Copied" : "Copy"}
    </Button>
  )
}
