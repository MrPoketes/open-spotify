import { type KeyboardEvent, type MouseEvent, useState } from "react"

// Where a context menu opens, and the element that gets focus back when it
// closes.
export interface ContextMenuAnchor {
  readonly x: number
  readonly y: number
  readonly opener: HTMLElement
}

const opensMenu = (event: KeyboardEvent) =>
  event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")

// Opens a context menu from an element: on right-click, Shift+F10, or the
// context-menu key.
export function useContextMenu() {
  const [anchor, setAnchor] = useState<ContextMenuAnchor | null>(null)

  const openAtPointer = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    setAnchor({ x: event.clientX, y: event.clientY, opener: event.currentTarget })
  }

  // A key has no pointer position, so the menu opens under the element.
  const openWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!opensMenu(event)) {
      return
    }
    event.preventDefault()
    const { left, bottom } = event.currentTarget.getBoundingClientRect()
    setAnchor({ x: left, y: bottom, opener: event.currentTarget })
  }

  return { anchor, close: () => setAnchor(null), openAtPointer, openWithKeyboard }
}
