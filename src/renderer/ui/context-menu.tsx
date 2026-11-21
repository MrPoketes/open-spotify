import { ChevronRight } from "lucide-react"
import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { menuItemTargetForKey } from "./menu-item-target"
import type { ContextMenuAnchor } from "./use-context-menu"

export interface ContextMenuAction {
  // Tells apart actions with the same label, such as two playlists that
  // share a name.
  readonly id?: string
  readonly label: string
  readonly onSelect: () => void
}

export interface ContextSubmenu {
  readonly label: string
  readonly items: ReadonlyArray<ContextMenuItem>
}

export type ContextMenuItem = ContextMenuAction | ContextSubmenu

const isSubmenu = (item: ContextMenuItem): item is ContextSubmenu => "items" in item

const menuItemKey = (item: ContextMenuItem) =>
  isSubmenu(item) ? item.label : (item.id ?? item.label)

// A menu opened near the right or bottom edge of the window moves back
// inside it.
function useShiftIntoWindow(menuRef: RefObject<HTMLElement | null>) {
  const [shift, setShift] = useState({ marginLeft: 0, marginTop: 0 })
  useLayoutEffect(() => {
    if (!menuRef.current) {
      return
    }
    const { right, bottom } = menuRef.current.getBoundingClientRect()
    setShift({
      marginLeft: Math.min(0, window.innerWidth - right),
      marginTop: Math.min(0, window.innerHeight - bottom),
    })
  }, [menuRef])
  return shift
}

// A long menu, such as a list of playlists, scrolls instead of running off
// the window. A menu with submenus cannot scroll, because its scroll box
// would clip the submenus that open beside it.
const scrollClassNames = (items: ReadonlyArray<ContextMenuItem>) =>
  items.some(isSubmenu) ? "" : "max-h-[calc(100dvh-1rem)] overflow-y-auto"

interface MenuListProps {
  readonly label: string
  readonly items: ReadonlyArray<ContextMenuItem>
  readonly closeAll: () => void
  // Only a submenu has an item to go back to.
  readonly backToParent?: () => void
}

function MenuList({ label, items, closeAll, backToParent }: MenuListProps) {
  const menuRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null)
  const shift = useShiftIntoWindow(menuRef)

  useLayoutEffect(() => itemRefs.current[0]?.focus(), [])

  const openItem = (item: ContextMenuItem, index: number) => {
    if (isSubmenu(item)) {
      setOpenSubmenuIndex(index)
      return
    }
    closeAll()
    item.onSelect()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    // A submenu sits inside its parent menu, and the whole menu sits inside
    // the element that opened it in the React tree. Neither may act on a key
    // meant for this menu.
    event.stopPropagation()
    const focusedIndex = itemRefs.current.findIndex((item) => item === document.activeElement)
    const targetIndex = menuItemTargetForKey(event.key, focusedIndex, items.length)
    if (targetIndex !== undefined) {
      event.preventDefault()
      itemRefs.current[targetIndex]?.focus()
      return
    }
    const focusedItem = items[focusedIndex]
    if (event.key === "ArrowRight" && focusedItem !== undefined && isSubmenu(focusedItem)) {
      event.preventDefault()
      setOpenSubmenuIndex(focusedIndex)
      return
    }
    if (event.key === "Escape" || event.key === "ArrowLeft" || event.key === "Tab") {
      event.preventDefault()
      closeWithKey(event.key, { closeAll, backToParent })
    }
  }

  const backToItem = (index: number) => () => {
    setOpenSubmenuIndex(null)
    itemRefs.current[index]?.focus()
  }

  return (
    <ul
      ref={menuRef}
      role="menu"
      aria-label={label}
      // Clicking the menu's padding must not move focus out and close it.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={shift}
      className={`flex min-w-48 flex-col rounded-large bg-surface-overlay p-1 shadow-overlay transition-[opacity,translate] duration-200 ease-out starting:-translate-y-2 starting:opacity-0 ${scrollClassNames(items)}`}
    >
      {items.map((item, index) => (
        <li key={menuItemKey(item)} role="none" className="relative">
          <button
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-haspopup={isSubmenu(item) ? "menu" : undefined}
            aria-expanded={isSubmenu(item) ? openSubmenuIndex === index : undefined}
            onClick={() => openItem(item, index)}
            className="flex w-full items-center justify-between gap-3 rounded-small px-3 py-2 text-left text-sm transition-colors duration-120 ease-out hover:bg-surface-raised focus:bg-surface-raised"
          >
            {item.label}
            {isSubmenu(item) ? <ChevronRight aria-hidden size={16} /> : null}
          </button>
          {isSubmenu(item) && openSubmenuIndex === index ? (
            <Submenu submenu={item} closeAll={closeAll} backToParent={backToItem(index)} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

interface SubmenuProps {
  readonly submenu: ContextSubmenu
  readonly closeAll: () => void
  readonly backToParent: () => void
}

function Submenu({ submenu, closeAll, backToParent }: SubmenuProps) {
  return (
    <div className="absolute top-0 left-full z-10 -mt-1 pl-1">
      <MenuList
        label={submenu.label}
        items={submenu.items}
        closeAll={closeAll}
        backToParent={backToParent}
      />
    </div>
  )
}

// Escape and the left arrow close a submenu and go back to its item; Escape
// closes the top menu too. Tab leaves the menu altogether.
const closeWithKey = (
  key: "Escape" | "ArrowLeft" | "Tab",
  {
    closeAll,
    backToParent,
  }: { readonly closeAll: () => void; readonly backToParent: (() => void) | undefined },
) => {
  if (key === "Tab") {
    closeAll()
    return
  }
  if (backToParent) {
    backToParent()
    return
  }
  if (key === "Escape") {
    closeAll()
  }
}

interface ContextMenuProps {
  readonly label: string
  readonly items: ReadonlyArray<ContextMenuItem>
  readonly anchor: ContextMenuAnchor
  readonly onClose: () => void
}

// Follows the WAI-ARIA menu pattern. The menu is portalled to the body, so it
// can open from an element whose parent cannot hold it, such as a table row,
// and is not clipped by a scrolling pane.
export function ContextMenu({ label, items, anchor, onClose }: ContextMenuProps) {
  const closeAndFocusOpener = () => {
    onClose()
    anchor.opener.focus()
  }

  const closeWhenFocusLeaves = (event: FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      onClose()
    }
  }

  return createPortal(
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The wrapper only stops a right-click inside the menu from reopening it; the menu inside handles every interaction.
    <div
      onBlur={closeWhenFocusLeaves}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      style={{ position: "fixed", left: anchor.x, top: anchor.y }}
      className="z-20"
    >
      <MenuList label={label} items={items} closeAll={closeAndFocusOpener} />
    </div>,
    document.body,
  )
}
