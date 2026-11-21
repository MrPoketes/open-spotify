import { Effect } from "effect"
import { useLoad } from "../../lib/use-load"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { EpisodeList } from "./episode-list"
import { ShowHeader } from "./show-header"

const loadShow = Effect.fn("loadShow")(function* (showId: string) {
  const spotify = yield* SpotifyApi
  return yield* Effect.all(
    { show: spotify.getShow(showId), firstPage: spotify.getShowEpisodePage(showId, 0) },
    { concurrency: "unbounded" },
  )
})

export function ShowPage({ showId }: { readonly showId: string }) {
  const { state, retry } = useLoad(loadShow(showId), "The show failed to load")

  if (state.status === "loading") {
    return <output className="text-sm text-muted">Loading show…</output>
  }
  if (state.status === "failed") {
    return (
      <SpotifyLoadFailure error={state.error} message="This show didn't load." onRetry={retry} />
    )
  }
  const { show, firstPage } = state.value
  return (
    <div className="flex flex-col gap-8">
      <ShowHeader show={show} />
      <EpisodeList showId={showId} showUri={show.uri} firstPage={firstPage} />
    </div>
  )
}
