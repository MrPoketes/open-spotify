import { Effect } from "effect"
import { use, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { SpotifyApi } from "../spotify/spotify-api"
import type { SearchPage, SearchResults, SearchType } from "../spotify/spotify-search"

type NextPageStatus = "idle" | "loading" | "failed"

interface LoadedResults<A> {
  readonly items: ReadonlyArray<A | null>
  // Null once the last page has loaded.
  readonly nextOffset: number | null
  readonly nextPage: NextPageStatus
}

// The offset counts the null results too, because Spotify does.
const offsetAfter = <A>(page: SearchPage<A>, offset: number) =>
  page.next === null ? null : offset + page.items.length

export interface MoreResultsOptions<A> {
  readonly query: string
  readonly type: SearchType
  readonly firstPage: SearchPage<A>
  readonly pageOf: (results: SearchResults) => SearchPage<A>
}

// The results of one kind for a query, starting from the first page and
// asking Spotify for the next page of that kind alone when asked.
export function useMoreResults<A>({ query, type, firstPage, pageOf }: MoreResultsOptions<A>) {
  const runtime = use(RendererRuntimeContext)
  const [loaded, setLoaded] = useState<LoadedResults<A>>(() => ({
    items: firstPage.items,
    nextOffset: offsetAfter(firstPage, 0),
    nextPage: "idle",
  }))

  const loadMore = () => {
    const { nextOffset, nextPage } = loaded
    if (nextOffset === null || nextPage === "loading") {
      return
    }
    setLoaded((current) => ({ ...current, nextPage: "loading" }))
    const showPage = (page: SearchPage<A>) =>
      Effect.sync(() =>
        setLoaded((current) => ({
          items: [...current.items, ...page.items],
          nextOffset: offsetAfter(page, nextOffset),
          nextPage: "idle",
        })),
      )
    const showFailure = Effect.sync(() =>
      setLoaded((current) => ({ ...current, nextPage: "failed" })),
    )
    const load = Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      return pageOf(yield* spotify.search(query, [type], nextOffset))
    }).pipe(
      Effect.tapError((error) => Effect.logWarning("More search results failed to load", error)),
      Effect.matchEffect({ onFailure: () => showFailure, onSuccess: showPage }),
    )
    runtime.runFork(load)
  }

  return {
    results: loaded.items.filter((item) => item !== null),
    hasMore: loaded.nextOffset !== null,
    nextPage: loaded.nextPage,
    loadMore,
  }
}
