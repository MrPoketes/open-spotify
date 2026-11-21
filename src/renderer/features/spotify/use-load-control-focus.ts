import { useLayoutEffect, useRef } from "react"
import type { RowFocusHandle } from "../../ui/use-roving-focus"
import type { NextPageStatus } from "./use-next-pages"

// What ends a list of pages: Load more, Retry after a page failed to load,
// a loading message with no button, or nothing once no button is needed.
export type LoadControl = "load-more" | "retry" | "loading" | "none"

// A list that loads its next page as its end scrolls into view has no Load
// more button. Only Retry, after a page failed, can take focus.
export const scrollLoadedListControls: Record<NextPageStatus, LoadControl> = {
  idle: "none",
  loading: "loading",
  failed: "retry",
}

const hasButton = (loadControl: LoadControl) =>
  loadControl === "load-more" || loadControl === "retry"

// Pressing Load more or Retry can remove the pressed button: a failed page
// replaces Load more with Retry, Retry gives way to Load more or a loading
// message as it asks for the page again, and the last page takes Load more
// away. Focus would drop to the page body, so it moves to whatever took the
// button's place: the other button, or the first result the page added. A
// loading message cannot take focus, so focus waits for the page to arrive.
export function useLoadControlFocus(loadControl: LoadControl, resultCount: number) {
  const loadMoreRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const resultRowsRef = useRef<RowFocusHandle>(null)
  const previous = useRef({ loadControl, resultCount })
  const isFocusWaitingForPage = useRef(false)

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = { loadControl, resultCount }
    if (loadControl === before.loadControl) {
      return
    }
    // Focus anywhere but the body was not on a removed button, so it stays
    // where the user put it. A list that loads as it scrolls changes its
    // control with no button pressed, which must not take focus either.
    const wasFocusDropped =
      document.activeElement === document.body &&
      (hasButton(before.loadControl) || isFocusWaitingForPage.current)
    isFocusWaitingForPage.current = wasFocusDropped && loadControl === "loading"
    if (!wasFocusDropped) {
      return
    }
    if (loadControl === "none") {
      resultRowsRef.current?.focusRow(before.resultCount)
      return
    }
    // A loading message has no button, so focus waits for the page.
    const buttonRefs = { "load-more": loadMoreRef, retry: retryRef, loading: null }
    buttonRefs[loadControl]?.current?.focus()
  }, [loadControl, resultCount])

  return { loadMoreRef, retryRef, resultRowsRef }
}
