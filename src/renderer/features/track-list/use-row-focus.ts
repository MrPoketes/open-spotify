import { type KeyboardEvent, type RefObject, useLayoutEffect, useRef, useState } from "react"
import { targetRowForKey } from "../../ui/use-roving-focus"

interface RowFocusOptions {
  readonly rowsRef: RefObject<HTMLElement | null>
  readonly rowCount: number
  // A row to focus as soon as it is rendered.
  readonly initialFocusedIndex: number | undefined
  readonly scrollToIndex: (index: number) => void
}

// Roving focus for a virtualised list. useRovingFocus cannot serve it: a row
// far away is not in the DOM until the list scrolls to it, so focus moves on
// the first render that contains it.
export function useRowFocus({
  rowsRef,
  rowCount,
  initialFocusedIndex,
  scrollToIndex,
}: RowFocusOptions) {
  const [focusedIndex, setFocusedIndex] = useState(initialFocusedIndex ?? 0)
  const focusPending = useRef(initialFocusedIndex !== undefined)

  // Focus moves in the commit that mounts the row. The row that had focus may
  // have just scrolled out of the DOM, and a passive effect would leave focus
  // on <body> until it ran.
  useLayoutEffect(() => {
    if (!focusPending.current) {
      return
    }
    const row = rowsRef.current?.querySelector<HTMLElement>(`[data-index="${focusedIndex}"]`)
    if (!row) {
      return
    }
    focusPending.current = false
    row.focus()
  })

  const onKeyDown = (event: KeyboardEvent) => {
    const targetRow = targetRowForKey(event, focusedIndex, rowCount)
    if (targetRow === undefined) {
      return
    }
    event.preventDefault()
    focusPending.current = true
    setFocusedIndex(targetRow)
    scrollToIndex(targetRow)
  }

  return { focusedIndex, setFocusedIndex, onKeyDown }
}
