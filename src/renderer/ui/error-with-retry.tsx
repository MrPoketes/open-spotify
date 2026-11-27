import { CircleAlert, RotateCw } from "lucide-react"
import type { Ref } from "react"
import { Button } from "./button"

interface ErrorWithRetryProps {
  readonly message: string
  readonly detail?: string
  readonly onRetry: () => void
  readonly retryRef?: Ref<HTMLButtonElement>
}

// Quiet on purpose: a page can show several of these at once, and the accent
// color is kept for what plays and for primary actions (docs/design.md).
export function ErrorWithRetry({ message, detail, onRetry, retryRef }: ErrorWithRetryProps) {
  return (
    <div role="alert" className="flex items-start gap-3 text-sm">
      <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0 text-muted" />
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p>{message}</p>
        {detail !== undefined && <p className="text-xs text-muted">{detail}</p>}
        <Button variant="outline" size="sm" className="mt-1" onClick={onRetry} ref={retryRef}>
          <RotateCw aria-hidden size={14} />
          Retry
        </Button>
      </div>
    </div>
  )
}
