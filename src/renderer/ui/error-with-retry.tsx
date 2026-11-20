interface ErrorWithRetryProps {
  readonly message: string
  readonly onRetry: () => void
}

export function ErrorWithRetry({ message, onRetry }: ErrorWithRetryProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-sm">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75"
      >
        Retry
      </button>
    </div>
  )
}
