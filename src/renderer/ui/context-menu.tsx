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

// The menu is portalled to the body, so it can open from an element whose
// parent cannot hold it, such as a table row, and is not clipped by a
// scrolling pane.
export function ContextMenu({ label, items, anchor, onClose }: ContextMenuProps) {
  const closeAndFocusOpener = () => {
    onClose()
    anchor.opener.focus()
  }

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
