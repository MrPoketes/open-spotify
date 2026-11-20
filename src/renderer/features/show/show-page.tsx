import { Match } from "effect"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { EpisodeList } from "./episode-list"
import { ShowHeader } from "./show-header"
import { useShowPage } from "./use-show-page"

export function ShowPage({ showId }: { readonly showId: string }) {
  const { state, retryShow, loadMoreEpisodes } = useShowPage(showId)

  return Match.valueTags(state, {
    Loading: () => <output className="text-muted">Loading show…</output>,
    Failed: () => <ErrorWithRetry message="This show didn't load." onRetry={retryShow} />,
    Loaded: ({ show, episodes, nextOffset, nextPage }) => (
      <div className="flex flex-col gap-8">
        <ShowHeader show={show} />
        <EpisodeList
          episodes={episodes}
          hasMoreEpisodes={nextOffset !== null}
          nextPage={nextPage}
          onLoadMore={loadMoreEpisodes}
        />
      </div>
    ),
  })
}
