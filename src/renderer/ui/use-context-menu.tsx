import { type KeyboardEvent, type MouseEvent, useState } from "react"
import { ContextMenu, type ContextMenuAnchor } from "./context-menu"
import type { MenuItem } from "./menu-list"

interface ContextMenuContent {
  readonly label: string
  readonly items: ReadonlyArray<MenuItem>
}

const isMenuKey = (event: KeyboardEvent) =>
  event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")

// Opens a context menu from an element: on right-click, Shift+F10, or the
// context-menu key. An element with no menu, or with no items in it, opens
// nothing (docs/design.md).
export function useContextMenu(content: ContextMenuContent | null) {
  const [anchor, setAnchor] = useState<ContextMenuAnchor | null>(null)
  const opensMenu = content !== null && content.items.length > 0

  const openAtPointer = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    setAnchor({ x: event.clientX, y: event.clientY, opener: event.currentTarget })
  }

  // A key has no pointer position, so the menu opens under the element.
  const openWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!opensMenu || !isMenuKey(event)) {
      return
    }
    event.preventDefault()
    const { left, bottom } = event.currentTarget.getBoundingClientRect()
    setAnchor({ x: left, y: bottom, opener: event.currentTarget })
  }

  const menu =
    opensMenu && anchor !== null ? (
      <ContextMenu
        label={content.label}
        items={content.items}
        anchor={anchor}
        onClose={() => setAnchor(null)}
      />
    ) : null

  return {
    opensMenu,
    // Left off an element without a menu, so a right-click there does what it
    // does anywhere else.
    openAtPointer: opensMenu ? openAtPointer : undefined,
    openWithKeyboard,
    menu,
  }
}
