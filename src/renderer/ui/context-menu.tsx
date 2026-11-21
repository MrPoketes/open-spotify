import { useEffect, useEffectEvent } from "react"
import { createPortal } from "react-dom"
import { closeWhenFocusLeaves } from "./close-when-focus-leaves"
import { type MenuItem, MenuList } from "./menu-list"
import type { ContextMenuAnchor } from "./use-context-menu"

interface ContextMenuProps {
  readonly label: string
  readonly items: ReadonlyArray<MenuItem>
  readonly anchor: ContextMenuAnchor
  readonly onClose: () => void
}

// The menu stays where it opened, so it closes once a pane holding its
// opener scrolls. The menu's own scrolling, in a long list of items, does not
// hold the opener and leaves it open. Scroll events do not bubble, so only a
// capturing listener hears every pane.
function useCloseWhenOpenerScrolls(opener: HTMLElement, close: () => void) {
  const closeOnScroll = useEffectEvent(close)

  useEffect(() => {
    const closeIfOpenerScrolled = (event: Event) => {
      if (event.target instanceof Node && event.target.contains(opener)) {
        closeOnScroll()
      }
    }
    document.addEventListener("scroll", closeIfOpenerScrolled, { capture: true })
    return () => document.removeEventListener("scroll", closeIfOpenerScrolled, { capture: true })
  }, [opener])
}

// The menu is portalled to the body, so it can open from an element whose
// parent cannot hold it, such as a table row, and is not clipped by a
// scrolling pane.
export function ContextMenu({ label, items, anchor, onClose }: ContextMenuProps) {
  const closeAndFocusOpener = () => {
    onClose()
    // A menu closed by scrolling must not scroll the page back to its opener.
    anchor.opener.focus({ preventScroll: true })
  }
  useCloseWhenOpenerScrolls(anchor.opener, closeAndFocusOpener)

  return createPortal(
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The wrapper only stops a right-click inside the menu from reopening it; the menu inside handles every interaction.
    <div
      onBlur={closeWhenFocusLeaves(onClose)}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      style={{ position: "fixed", left: anchor.x, top: anchor.y }}
      className="z-20"
    >
      <MenuList label={label} items={items} closeAll={closeAndFocusOpener} tabReturnsToOpener />
    </div>,
    document.body,
  )
}
