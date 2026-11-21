import { useLayoutEffect, useRef } from "react"
import type { RowFocusHandle } from "../../ui/use-roving-focus"

// What ends a section of results: Load more, Retry after a page failed to
// load, or nothing once the last page has loaded.
export type LoadControl = "load-more" | "retry" | "none"

// Pressing Load more or Retry can remove the pressed button: a failed page
// replaces Load more with Retry, Retry gives way to Load more as it asks for
// the page again, and the last page takes Load more away. Focus would drop to
// the page body, so it moves to whatever took the button's place: the other
// button, or the first result the last page added.
export function useLoadControlFocus(loadControl: LoadControl, resultCount: number) {
  const loadMoreRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const resultRowsRef = useRef<RowFocusHandle>(null)
  const previous = useRef({ loadControl, resultCount })

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = { loadControl, resultCount }
    // Focus anywhere but the body was not on the removed button, so it stays
    // where the user put it.
    if (loadControl === before.loadControl || document.activeElement !== document.body) {
      return
    }
    if (loadControl === "none") {
      resultRowsRef.current?.focusRow(before.resultCount)
      return
    }
    const button = loadControl === "load-more" ? loadMoreRef : retryRef
    button.current?.focus()
  }, [loadControl, resultCount])

  return { loadMoreRef, retryRef, resultRowsRef }
}
