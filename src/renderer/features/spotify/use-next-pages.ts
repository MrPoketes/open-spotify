import { Effect } from "effect"
import { use, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import type { SpotifyApi, SpotifyApiError } from "./spotify-api"
import type { Page } from "./spotify-paging"

type NextPageStatus = "idle" | "loading" | "failed"

interface LoadedPages<A> {
  readonly items: ReadonlyArray<A>
  // Null once the last page has loaded.
  readonly nextOffset: number | null
  readonly nextPage: NextPageStatus
}

// The offset counts every item Spotify sent, including the nulls it sends in
// place of items it no longer serves.
const offsetAfter = <A>(page: Page<A>, offset: number) =>
  page.next === null ? null : offset + page.items.length

interface NextPagesOptions<A> {
  readonly firstPage: Page<A>
  readonly loadPage: (offset: number) => Effect.Effect<Page<A>, SpotifyApiError, SpotifyApi>
}

// The items of a paged list, starting from the first page and loading the
// next one when asked.
export function useNextPages<A>({ firstPage, loadPage }: NextPagesOptions<A>) {
  const runtime = use(RendererRuntimeContext)
  const [loaded, setLoaded] = useState<LoadedPages<A>>(() => ({
    items: firstPage.items,
    nextOffset: offsetAfter(firstPage, 0),
    nextPage: "idle",
  }))

  const loadNextPage = () => {
    const { nextOffset, nextPage } = loaded
    if (nextOffset === null || nextPage === "loading") {
      return
    }
    setLoaded((current) => ({ ...current, nextPage: "loading" }))
    const showPage = (page: Page<A>) =>
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
    const load = loadPage(nextOffset).pipe(
      Effect.tapError((error) => Effect.logWarning("A page failed to load", error)),
      Effect.matchEffect({ onFailure: () => showFailure, onSuccess: showPage }),
    )
    runtime.runFork(load)
  }

  return { ...loaded, loadNextPage }
}
