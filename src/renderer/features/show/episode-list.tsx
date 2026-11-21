import { Effect } from "effect"
import { useId } from "react"
import { NextPageFooter } from "../spotify/next-page-footer"
import { SpotifyApi } from "../spotify/spotify-api"
import type { ShowEpisodePage } from "../spotify/spotify-show"
import { scrollLoadedListControls, useLoadControlFocus } from "../spotify/use-load-control-focus"
import { useNextPages } from "../spotify/use-next-pages"
import { EpisodeRows } from "./episode-rows"

interface EpisodeListProps {
  readonly showId: string
  readonly showUri: string
  readonly firstPage: ShowEpisodePage
}

// Later pages load as the end of the list scrolls into view.
export function EpisodeList({ showId, showUri, firstPage }: EpisodeListProps) {
  const headingId = useId()
  const loadPage = (offset: number) =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      return yield* spotify.getShowEpisodePage(showId, offset)
    })
  const { items, nextOffset, nextPage, loadNextPage } = useNextPages({ firstPage, loadPage })
  const episodes = items.filter((episode) => episode !== null)
  const hasMoreEpisodes = nextOffset !== null
  const { retryRef, resultRowsRef } = useLoadControlFocus(
    scrollLoadedListControls[nextPage],
    episodes.length,
  )

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="font-display text-xl font-bold">
        Episodes
      </h2>
      {episodes.length === 0 && !hasMoreEpisodes && (
        <p className="text-muted">This show has no episodes yet.</p>
      )}
      {episodes.length > 0 && (
        <EpisodeRows showUri={showUri} episodes={episodes} rowFocusRef={resultRowsRef} />
      )}
      <NextPageFooter
        kind="episodes"
        nextPage={nextPage}
        loadNextPage={loadNextPage}
        wantsNextPage={hasMoreEpisodes}
        retryRef={retryRef}
      />
    </section>
  )
}
