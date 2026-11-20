import { ErrorWithRetry } from "../../ui/error-with-retry"

// Below the list and stuck to the bottom of the view, so it shows wherever the
// user has scrolled without moving any row.
export function PageFailedAlert({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="sticky bottom-0 bg-surface py-2">
      <ErrorWithRetry message="Some tracks didn't load." onRetry={onRetry} />
    </div>
  )
}
