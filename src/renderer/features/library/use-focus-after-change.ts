import { useLayoutEffect, useRef } from "react"
import type { LibraryEntryKind } from "../../../shared/library-layout"

// Gives a control a focus key: the ref it needs so a change can move focus to it.
export type FocusAfterChange = (focusKey: string) => (element: HTMLElement | null) => void

// An entry's row uses its URI as its focus key.
export const sectionFocusKey = (kind: LibraryEntryKind) => `section:${kind}`
export const showSectionFocusKey = (kind: LibraryEntryKind) => `show:${kind}`
export const nameFilterFocusKey = "name-filter"

// A change can move or remove the focused control, which would drop keyboard
// users onto the page body. After such a change, focus goes to the first of
// the named controls that is on screen, or else to the name filter, which
// always is.
export const useFocusAfterChange = () => {
  const pendingFocusKeys = useRef<ReadonlyArray<string>>([])
  const renderedControls = useRef(new Map<string, HTMLElement>())

  // Runs after the refs of the changed render are set, and before paint.
  useLayoutEffect(() => {
    if (pendingFocusKeys.current.length === 0) return
    const target = pendingFocusKeys.current
      .map((focusKey) => renderedControls.current.get(focusKey))
      .find((control) => control !== undefined)
    target?.focus()
    pendingFocusKeys.current = []
    renderedControls.current.clear()
  })

  const focusAfterChange: FocusAfterChange = (focusKey) => (element) => {
    if (element !== null && pendingFocusKeys.current.includes(focusKey)) {
      renderedControls.current.set(focusKey, element)
    }
  }

  const moveFocusAfterChange = (focusKeys: ReadonlyArray<string>) => {
    pendingFocusKeys.current = [...focusKeys, nameFilterFocusKey]
  }

  return { focusAfterChange, moveFocusAfterChange }
}
