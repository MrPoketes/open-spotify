import { Effect, Fiber } from "effect"
import { use, useCallback, useEffect, useRef, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import type { SpotifyApi } from "../spotify/spotify-api"

interface PagedItemsOptions<A> {
  readonly firstPage: ReadonlyArray<A>
  readonly pageSize: number
  readonly loadPage: (offset: number) => Effect.Effect<ReadonlyArray<A>, unknown, SpotifyApi>
}

// Assumes the first page ends on a page boundary or at the end of the list,
// which holds for a playlist's embedded first page of 100 items and for a
// first page of exactly one page size, such as Liked Songs' first 50.
const offsetsCoveredBy = (itemCount: number, pageSize: number) =>
  new Set(Array.from({ length: Math.ceil(itemCount / pageSize) }, (_, page) => page * pageSize))

const withOffset = (offsets: ReadonlySet<number>, offset: number) => new Set(offsets).add(offset)

const withoutOffset = (offsets: ReadonlySet<number>, offset: number) => {
  const remaining = new Set(offsets)
  remaining.delete(offset)
  return remaining
}

// Keeps the items loaded so far and loads the pages that cover a range of
// indexes when it is first asked for. Items not loaded yet are undefined.
export function usePagedItems<A>({ firstPage, pageSize, loadPage }: PagedItemsOptions<A>) {
  const runtime = use(RendererRuntimeContext)
  const [items, setItems] = useState<ReadonlyArray<A | undefined>>(firstPage)
  const [failedOffsets, setFailedOffsets] = useState<ReadonlySet<number>>(new Set())
  const requestedOffsets = useRef(offsetsCoveredBy(firstPage.length, pageSize))
  const pageLoads = useRef(new Set<Fiber.Fiber<void>>())

  useEffect(() => {
    const loads = pageLoads.current
    return () => {
      for (const load of loads) {
        runtime.runFork(Fiber.interrupt(load))
      }
    }
  }, [runtime])

  const requestPage = useCallback(
    (offset: number) => {
      requestedOffsets.current.add(offset)
      const showPage = (page: ReadonlyArray<A>) =>
        Effect.sync(() => {
          setItems((current) => {
            const next = [...current]
            for (const [pageIndex, item] of page.entries()) {
              next[offset + pageIndex] = item
            }
            return next
          })
          setFailedOffsets((current) => withoutOffset(current, offset))
        })
      // A failed page is forgotten, so scrolling to it again or Retry asks
      // for it once more.
      const showFailure = Effect.sync(() => {
        requestedOffsets.current.delete(offset)
        setFailedOffsets((current) => withOffset(current, offset))
      })
      const load = loadPage(offset).pipe(
        Effect.tapError((error) => Effect.logError("A page of tracks failed to load", error)),
        Effect.matchEffect({ onFailure: () => showFailure, onSuccess: showPage }),
      )
      const pageLoad = runtime.runFork(load)
      pageLoads.current.add(pageLoad)
      pageLoad.addObserver(() => pageLoads.current.delete(pageLoad))
    },
    [runtime, loadPage],
  )

  const loadRange = useCallback(
    (firstIndex: number, lastIndex: number) => {
      const firstOffset = firstIndex - (firstIndex % pageSize)
      for (let offset = firstOffset; offset <= lastIndex; offset += pageSize) {
        if (!requestedOffsets.current.has(offset)) {
          requestPage(offset)
        }
      }
    },
    [pageSize, requestPage],
  )

  // A failed page may already be asked for again by scrolling back to it.
  const retry = () => {
    for (const offset of failedOffsets) {
      if (!requestedOffsets.current.has(offset)) {
        requestPage(offset)
      }
    }
  }

  return { items, pageFailed: failedOffsets.size > 0, loadRange, retry }
}
