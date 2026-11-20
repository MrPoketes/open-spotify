import { Effect } from "effect"
import { type ActionDispatch, use, useEffect, useReducer } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { SpotifyApi } from "../spotify/spotify-api"
import { type ShowPageEvent, nextShowPageState } from "./show-page-state"

type Dispatch = ActionDispatch<[event: ShowPageEvent]>

const loadShow = Effect.fn("loadShow")(
  function* (showId: string, dispatch: Dispatch) {
    const spotify = yield* SpotifyApi
    const { show, firstPage } = yield* Effect.all(
      { show: spotify.getShow(showId), firstPage: spotify.getShowEpisodePage(showId, 0) },
      { concurrency: "unbounded" },
    ).pipe(
      Effect.tapError((error) => Effect.logWarning("Could not load show", showId, error)),
      Effect.tapError(() => Effect.sync(() => dispatch({ _tag: "ShowFailed" }))),
    )
    dispatch({ _tag: "ShowLoaded", show, firstPage })
  },
  (load) => Effect.ignore(load),
)

const loadEpisodePage = Effect.fn("loadEpisodePage")(
  function* (showId: string, offset: number, dispatch: Dispatch) {
    const spotify = yield* SpotifyApi
    const page = yield* spotify.getShowEpisodePage(showId, offset).pipe(
      Effect.tapError((error) => Effect.logWarning("Could not load episodes", showId, error)),
      Effect.tapError(() => Effect.sync(() => dispatch({ _tag: "PageFailed" }))),
    )
    dispatch({ _tag: "PageLoaded", page, offset })
  },
  (load) => Effect.ignore(load),
)

export const useShowPage = (showId: string) => {
  const runtime = use(RendererRuntimeContext)
  const [state, dispatch] = useReducer(nextShowPageState, { _tag: "Loading" })

  useEffect(() => {
    const controller = new AbortController()
    runtime.runFork(loadShow(showId, dispatch), { signal: controller.signal })
    return () => controller.abort()
  }, [runtime, showId])

  const retryShow = () => {
    dispatch({ _tag: "ShowRequested" })
    runtime.runFork(loadShow(showId, dispatch))
  }

  const loadMoreEpisodes = () => {
    if (state._tag !== "Loaded" || state.nextOffset === null || state.nextPage === "loading") {
      return
    }
    dispatch({ _tag: "PageRequested" })
    runtime.runFork(loadEpisodePage(showId, state.nextOffset, dispatch))
  }

  return { state, retryShow, loadMoreEpisodes }
}
