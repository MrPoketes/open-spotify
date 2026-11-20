import { useId } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { useRovingFocus } from "../../ui/use-roving-focus"
import { useScrolledIntoView } from "../../ui/use-scrolled-into-view"
import type { Episode } from "../spotify/spotify-episode"
import { EpisodeRow } from "./episode-row"
import type { NextPageStatus } from "./show-page-state"

interface EpisodeListProps {
  readonly episodes: ReadonlyArray<Episode>
  readonly hasMoreEpisodes: boolean
  readonly nextPage: NextPageStatus
  readonly onLoadMore: () => void
}

export function EpisodeList({ episodes, hasMoreEpisodes, nextPage, onLoadMore }: EpisodeListProps) {
  const headingId = useId()
  const { onKeyDown, rowProps } = useRovingFocus(episodes.length)
  const scrollEndRef = useScrolledIntoView(onLoadMore, hasMoreEpisodes && nextPage === "idle")

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="font-display text-xl font-bold">
        Episodes
      </h2>
      {episodes.length === 0 && !hasMoreEpisodes && (
        <p className="text-muted">This show has no episodes yet.</p>
      )}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused episode, and the list moves focus between its episodes: the roving focus docs/design.md requires for lists */}
      <ul onKeyDown={onKeyDown} className="flex flex-col">
        {episodes.map((episode, index) => (
          <li key={episode.id}>
            <EpisodeRow episode={episode} rovingProps={rowProps(index)} />
          </li>
        ))}
      </ul>
      {nextPage === "loading" && (
        <output className="text-sm text-muted">Loading more episodes…</output>
      )}
      {nextPage === "failed" && (
        <ErrorWithRetry message="More episodes didn't load." onRetry={onLoadMore} />
      )}
      <div ref={scrollEndRef} />
    </section>
  )
}
