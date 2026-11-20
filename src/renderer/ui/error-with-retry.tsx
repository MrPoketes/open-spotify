import { AccentButton } from "./accent-button"

interface ErrorWithRetryProps {
  readonly message: string
  readonly onRetry: () => void
}

export function ErrorWithRetry({ message, onRetry }: ErrorWithRetryProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-sm">
      <p>{message}</p>
      <AccentButton label="Retry" onClick={onRetry} />
    </div>
  )
}
