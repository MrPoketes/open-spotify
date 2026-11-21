import type { Ref } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { LoadingMessage } from "../../ui/loading-message"
import { useScrolledIntoView } from "../../ui/use-scrolled-into-view"
import type { NextPageStatus } from "./use-next-pages"

interface NextPageFooterProps {
  // Plural, such as "episodes".
  readonly kind: string
  readonly nextPage: NextPageStatus
  readonly loadNextPage: () => void
  // Whether the list has another page it should show once the footer scrolls
  // into view.
  readonly wantsNextPage: boolean
  readonly retryRef: Ref<HTMLButtonElement>
}

// Sits below a list whose later pages load as the end of the list scrolls
// into view.
export function NextPageFooter({
  kind,
  nextPage,
  loadNextPage,
  wantsNextPage,
  retryRef,
}: NextPageFooterProps) {
  const scrollEndRef = useScrolledIntoView(loadNextPage, wantsNextPage && nextPage === "idle")
  return (
    <>
      {nextPage === "loading" && <LoadingMessage>{`Loading more ${kind}…`}</LoadingMessage>}
      {nextPage === "failed" && (
        <ErrorWithRetry
          message={`More ${kind} didn't load.`}
          onRetry={loadNextPage}
          retryRef={retryRef}
        />
      )}
      <div ref={scrollEndRef} />
    </>
  )
}
