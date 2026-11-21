import type { Ref } from "react"
import { AccentButton } from "./pill-button"

interface ErrorWithRetryProps {
  readonly message: string
  readonly onRetry: () => void
  readonly retryRef?: Ref<HTMLButtonElement>
}

export function ErrorWithRetry({ message, onRetry, retryRef }: ErrorWithRetryProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-sm">
      <p>{message}</p>
      <AccentButton label="Retry" onClick={onRetry} ref={retryRef} />
    </div>
  )
}
