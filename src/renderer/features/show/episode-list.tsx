import { Effect } from "effect"
import { PageSection } from "../../ui/page-section"
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
  const loadPage = Effect.fn("EpisodeList.loadPage")(function* (offset: number) {
    const spotify = yield* SpotifyApi
    return yield* spotify.getShowEpisodePage(showId, offset)
  })
  const { items, nextOffset, nextPage, loadNextPage } = useNextPages({ firstPage, loadPage })
  const episodes = items.filter((episode) => episode !== null)
  const hasMoreEpisodes = nextOffset !== null
  const { retryRef, resultRowsRef } = useLoadControlFocus(
    scrollLoadedListControls[nextPage.status],
    episodes.length,
  )

  return (
    <PageSection title="Episodes">
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
    </PageSection>
  )
}
