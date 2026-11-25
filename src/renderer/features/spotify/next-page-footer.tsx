import type { Ref } from "react"
import { LoadingMessage } from "../../ui/loading-message"
import { useScrolledIntoView } from "../../ui/use-scrolled-into-view"
import { SpotifyLoadFailure } from "./spotify-load-failure"
import type { NextPageState } from "./use-next-pages"

interface NextPageFooterProps {
  // Plural, such as "episodes".
  readonly kind: string
  readonly nextPage: NextPageState
  readonly loadNextPage: () => void
  // Whether the list has another page it should show once the footer scrolls
  // into view.
  readonly wantsNextPage: boolean
  readonly retryRef: Ref<HTMLButtonElement>
}

export function NextPageFooter({
  kind,
  nextPage,
  loadNextPage,
  wantsNextPage,
  retryRef,
}: NextPageFooterProps) {
  const scrollEndRef = useScrolledIntoView(
    loadNextPage,
    wantsNextPage && nextPage.status === "idle",
  )
  return (
    <>
      {nextPage.status === "loading" && <LoadingMessage>{`Loading more ${kind}…`}</LoadingMessage>}
      {nextPage.status === "failed" && (
        <SpotifyLoadFailure
          error={nextPage.error}
          message={`More ${kind} didn't load.`}
          onRetry={loadNextPage}
          retryRef={retryRef}
        />
      )}
      <div ref={scrollEndRef} />
    </>
  )
}
