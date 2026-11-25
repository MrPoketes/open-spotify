import { Effect } from "effect"
import { type ReactNode, type Ref, useId } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { LoadingMessage } from "../../ui/loading-message"
import { SecondaryButton } from "../../ui/pill-button"
import type { RowFocusHandle } from "../../ui/use-roving-focus"
import { SpotifyApi } from "../spotify/spotify-api"
import type { Page } from "../spotify/spotify-paging"
import type { SearchResults, SearchType } from "../spotify/spotify-search"
import { type LoadControl, useLoadControlFocus } from "../spotify/use-load-control-focus"
import { type NextPageStatus, useNextPages } from "../spotify/use-next-pages"

interface ResultSectionProps<A> {
  readonly query: string
  readonly type: SearchType
  // Plural and capitalised, such as "Tracks".
  readonly title: string
  readonly firstPage: Page<A | null>
  readonly pageOf: (results: SearchResults) => Page<A | null>
  readonly children: (results: ReadonlyArray<A>, rowFocusRef: Ref<RowFocusHandle>) => ReactNode
}

const loadControlFor = (nextPage: NextPageStatus, hasMore: boolean): LoadControl => {
  if (nextPage === "failed") {
    return "retry"
  }
  return hasMore ? "load-more" : "none"
}

// A kind of result with nothing on its first page is left out. Load more asks
// Spotify for the next page of this kind alone.
export function ResultSection<A>(props: ResultSectionProps<A>) {
  const { query, type, title, firstPage, pageOf, children } = props
  const headingId = useId()
  const loadPage = Effect.fn("ResultSection.loadPage")(function* (offset: number) {
    const spotify = yield* SpotifyApi
    return pageOf(yield* spotify.search(query, [type], offset))
  })
  const { items, nextOffset, nextPage, loadNextPage } = useNextPages({ firstPage, loadPage })
  const results = items.filter((item) => item !== null)
  const loadControl = loadControlFor(nextPage, nextOffset !== null)
  const { loadMoreRef, retryRef, resultRowsRef } = useLoadControlFocus(loadControl, results.length)
  const kind = title.toLowerCase()

  if (results.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="font-display text-xl font-bold">
        {title}
      </h2>
      {children(results, resultRowsRef)}
      {loadControl === "retry" ? (
        <ErrorWithRetry
          message={`More ${kind} didn't load.`}
          onRetry={loadNextPage}
          retryRef={retryRef}
        />
      ) : null}
      {loadControl === "load-more" ? (
        <div className="flex items-center gap-4">
          {/* Disabled with aria-disabled rather than disabled, so the button keeps focus while its page loads. */}
          <SecondaryButton
            label="Load more"
            aria-label={`Load more ${kind}`}
            aria-disabled={nextPage === "loading"}
            onClick={loadNextPage}
            ref={loadMoreRef}
          />
          {nextPage === "loading" ? (
            <LoadingMessage>{`Loading more ${kind}…`}</LoadingMessage>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
