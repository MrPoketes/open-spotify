import { type ReactNode, useId } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { type MoreResultsOptions, useMoreResults } from "./use-more-results"

interface ResultSectionProps<A> extends MoreResultsOptions<A> {
  // Plural and capitalised, such as "Tracks".
  readonly title: string
  readonly children: (results: ReadonlyArray<A>) => ReactNode
}

// A kind of result with nothing on its first page is left out.
export function ResultSection<A>({ title, children, ...moreResults }: ResultSectionProps<A>) {
  const headingId = useId()
  const { results, hasMore, nextPage, loadMore } = useMoreResults(moreResults)
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
        <ErrorWithRetry message={`More ${kind} didn't load.`} onRetry={loadMore} />
      ) : null}
      {hasMore && nextPage !== "failed" ? (
        <div className="flex items-center gap-4">
          {/* Disabled with aria-disabled rather than disabled, so the button keeps focus while its page loads. */}
          <button
            type="button"
            aria-label={`Load more ${kind}`}
            aria-disabled={nextPage === "loading"}
            onClick={loadMore}
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
