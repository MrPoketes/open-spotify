import { type KeyboardEvent, useCallback, useRef, useState } from "react"

type Move = (activeIndex: number, rowCount: number) => number

const moveDown: Move = (activeIndex, rowCount) => Math.min(activeIndex + 1, rowCount - 1)
const moveUp: Move = (activeIndex) => Math.max(activeIndex - 1, 0)

const movesByKey: Partial<Record<string, Move>> = {
  ArrowDown: moveDown,
  j: moveDown,
  ArrowUp: moveUp,
  k: moveUp,
  Home: () => 0,
  End: (_, rowCount) => rowCount - 1,
}

// The row a key moves focus to, or undefined for keys a list ignores.
export const targetRowForKey = (event: KeyboardEvent, activeIndex: number, rowCount: number) => {
  const move = movesByKey[event.key]
  // Modified keys belong to app-wide shortcuts such as Ctrl+K.
  if (move === undefined || event.ctrlKey || event.metaKey || event.altKey) {
    return undefined
  }
  return move(activeIndex, rowCount)
}

// A list is one tab stop (docs/design.md): only the active row is in the tab
// order, and the arrow keys or j and k move focus between rows. The tab stop
// starts on the first row, or on the given one, such as a list's chosen row.
export const useRovingFocus = (rowCount: number, initialIndex = 0) => {
  const [lastFocusedIndex, setLastFocusedIndex] = useState(initialIndex)
  const rows = useRef<Array<HTMLElement | null>>([])
  // The list can shrink below the last focused row, for example when it is
  // filtered. Without a cap no row would be in the tab order.
  const activeIndex = Math.min(lastFocusedIndex, rowCount - 1)

  const onKeyDown = (event: KeyboardEvent) => {
    const targetRow = targetRowForKey(event, activeIndex, rowCount)
    if (targetRow === undefined) {
      return
    }
    event.preventDefault()
    rows.current[targetRow]?.focus()
  }

  // Focuses the row at a position, or the last row if the list has shrunk
  // below it. Stable while the row count holds, so an effect can depend on it.
  const focusRow = useCallback(
    (index: number) => rows.current[Math.min(index, rowCount - 1)]?.focus(),
    [rowCount],
  )

  const rowProps = (index: number) => ({
    tabIndex: index === activeIndex ? 0 : -1,
    ref: (row: HTMLElement | null) => {
      rows.current[index] = row
    },
    onFocus: () => setLastFocusedIndex(index),
  })

  return { onKeyDown, rowProps, focusRow }
}

// Lets the owner of a list move focus to one of its rows, such as the first
// row that a newly loaded page added.
export interface RowFocusHandle {
  readonly focusRow: (index: number) => void
}

export type RovingRowProps = ReturnType<ReturnType<typeof useRovingFocus>["rowProps"]>
