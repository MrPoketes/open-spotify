import { Effect } from "effect"
import { useId, type ReactNode, type Ref } from "react"
import { Button } from "../../ui/button"
import { LoadingMessage } from "../../ui/loading-message"
import type { RowFocusHandle } from "../../ui/use-roving-focus"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import type { Page } from "../spotify/spotify-paging"
import type { SearchResults, SearchType } from "../spotify/spotify-search"
import { useLoadControlFocus, type LoadControl } from "../spotify/use-load-control-focus"
import { useNextPages, type NextPageState } from "../spotify/use-next-pages"

interface ResultSectionProps<A> {
  readonly query: string
  readonly type: SearchType
  // Plural and capitalised, such as "Tracks".
  readonly title: string
  readonly firstPage: Page<A | null>
  readonly pageOf: (results: SearchResults) => Page<A | null>
  readonly children: (results: ReadonlyArray<A>, rowFocusRef: Ref<RowFocusHandle>) => ReactNode
}

const loadControlFor = (nextPage: NextPageState, hasMore: boolean): LoadControl => {
  if (nextPage.status === "failed") {
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
      {nextPage.status === "failed" ? (
        <SpotifyLoadFailure
          error={nextPage.error}
          message={`More ${kind} didn't load.`}
          onRetry={loadNextPage}
          retryRef={retryRef}
        />
      ) : null}
      {loadControl === "load-more" ? (
        <div className="flex items-center gap-4">
          {/* Disabled with aria-disabled rather than disabled, so the button keeps focus while its page loads. */}
          <Button
            variant="secondary"
            aria-label={`Load more ${kind}`}
            aria-disabled={nextPage.status === "loading"}
            onClick={loadNextPage}
            ref={loadMoreRef}
          >
            Load more
          </Button>
          {nextPage.status === "loading" ? (
            <LoadingMessage>{`Loading more ${kind}…`}</LoadingMessage>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
