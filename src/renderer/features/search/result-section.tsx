import { Effect } from "effect"
import { type ReactNode, useId } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { SpotifyApi } from "../spotify/spotify-api"
import type { Page } from "../spotify/spotify-paging"
import type { SearchResults, SearchType } from "../spotify/spotify-search"
import { useNextPages } from "../spotify/use-next-pages"

interface ResultSectionProps<A> {
  readonly query: string
  readonly type: SearchType
  // Plural and capitalised, such as "Tracks".
  readonly title: string
  readonly firstPage: Page<A | null>
  readonly pageOf: (results: SearchResults) => Page<A | null>
  readonly children: (results: ReadonlyArray<A>) => ReactNode
}

// A kind of result with nothing on its first page is left out. Load more asks
// Spotify for the next page of this kind alone.
export function ResultSection<A>(props: ResultSectionProps<A>) {
  const { query, type, title, firstPage, pageOf, children } = props
  const headingId = useId()
  const loadPage = (offset: number) =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      return pageOf(yield* spotify.search(query, [type], offset))
    })
  const { items, nextOffset, nextPage, loadNextPage } = useNextPages({ firstPage, loadPage })
  const results = items.filter((item) => item !== null)
  const hasMore = nextOffset !== null
  const kind = title.toLowerCase()

  if (results.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="font-display text-xl font-bold">
        {title}
      </h2>
      {children(results)}
      {nextPage === "failed" ? (
        <ErrorWithRetry message={`More ${kind} didn't load.`} onRetry={loadNextPage} />
      ) : null}
      {hasMore && nextPage !== "failed" ? (
        <div className="flex items-center gap-4">
          {/* Disabled with aria-disabled rather than disabled, so the button keeps focus while its page loads. */}
          <button
            type="button"
            aria-label={`Load more ${kind}`}
            aria-disabled={nextPage === "loading"}
            onClick={loadNextPage}
            className="rounded-full bg-surface-raised px-4 py-2 text-sm font-semibold transition-opacity duration-120 ease-out aria-disabled:opacity-50"
          >
            Load more
          </button>
          {nextPage === "loading" ? (
            <output className="text-sm text-muted">Loading more {kind}…</output>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
