import { Check, ChevronRight } from "lucide-react"
import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { hasShortcutModifier } from "./has-shortcut-modifier"
import { menuItemTargetForKey } from "./menu-item-target"

export interface MenuAction {
  // Tells apart actions with the same label, such as two playlists that
  // share a name.
  readonly id?: string
  readonly label: string
  readonly onSelect: () => void
  // Set only for an action that turns something on or off, such as an item's
  // place in a folder.
  readonly checked?: boolean
}

interface MenuSubmenu {
  // Tells apart submenus with the same label, such as two folders that share
  // a name.
  readonly id?: string
  readonly label: string
  readonly items: ReadonlyArray<MenuItem>
}

export type MenuItem = MenuAction | MenuSubmenu

export type MenuOpenFocus = "first" | "last"

// Indexes for Array.at, where -1 is the last item.
const openFocusIndex: Record<MenuOpenFocus, number> = { first: 0, last: -1 }

const isSubmenu = (item: MenuItem): item is MenuSubmenu => "items" in item

const menuItemKey = (item: MenuItem) => item.id ?? item.label

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
const scrollClassNames = (items: ReadonlyArray<MenuItem>) =>
  items.some(isSubmenu) ? "" : "max-h-[calc(100dvh-1rem)] overflow-y-auto"

interface MenuPosition {
  readonly left: number
  readonly top: number
}

const menuStyle = (
  position: MenuPosition | undefined,
  shift: { readonly marginLeft: number; readonly marginTop: number },
): CSSProperties => (position === undefined ? shift : { position: "fixed", ...position, ...shift })

// Right-clicking inside a context menu must not reopen it underneath the pointer.
const preventContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

interface MenuListProps {
  readonly label: string
  readonly items: ReadonlyArray<MenuItem>
  readonly closeAll: () => void
  // Only a menu button names its menu, so the button can point at it.
  readonly id?: string
  readonly focusOnOpen?: MenuOpenFocus
  // A context menu is portalled to the end of the page, so letting Tab go
  // on from it would skip everything after its opener.
  readonly tabReturnsToOpener?: boolean
  // Only a submenu has an item to go back to.
  readonly backToParent?: () => void
  // Set by a portalled context menu, which pins the menu to the pointer and
  // catches its own blur.
  readonly position?: MenuPosition
  readonly onBlur?: (event: FocusEvent) => void
}

// Follows the WAI-ARIA menu pattern: arrow keys move between items and in
// and out of submenus, Escape closes the menu.
export function MenuList({
  label,
  items,
  closeAll,
  id,
  focusOnOpen = "first",
  tabReturnsToOpener = false,
  backToParent,
  position,
  onBlur,
}: MenuListProps) {
  const menuRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null)
  const shift = useShiftIntoWindow(menuRef)

  useLayoutEffect(() => itemRefs.current.at(openFocusIndex[focusOnOpen])?.focus(), [focusOnOpen])

  const openItem = (item: MenuItem, index: number) => {
    if (isSubmenu(item)) {
      setOpenSubmenuIndex(index)
      return
    }
    closeAll()
    item.onSelect()
  }

  const onKeyDown = (event: KeyboardEvent) =>
    applyMenuKey(event, {
      items,
      itemRefs,
      openSubmenu: setOpenSubmenuIndex,
      closeActions: { closeAll, tabReturnsToOpener, backToParent },
    })

  const backToItem = (index: number) => () => {
    setOpenSubmenuIndex(null)
    itemRefs.current[index]?.focus()
  }

  return (
    <ul
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={label}
      // Clicking the menu's padding must not move focus out and close it.
      tabIndex={-1}
      onBlur={onBlur}
      onContextMenu={position === undefined ? undefined : preventContextMenu}
      onKeyDown={onKeyDown}
      style={menuStyle(position, shift)}
      className={`${position === undefined ? "" : "z-20 "}flex min-w-48 flex-col rounded-large bg-surface-overlay p-1 shadow-overlay transition-[opacity,translate] duration-200 ease-out starting:-translate-y-2 starting:opacity-0 ${scrollClassNames(items)}`}
    >
      {items.map((item, index) => (
        <li key={menuItemKey(item)} role="none" className="relative">
          <MenuItemButton
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            item={item}
            isSubmenuOpen={openSubmenuIndex === index}
            onClick={() => openItem(item, index)}
          />
          {isSubmenu(item) && openSubmenuIndex === index ? (
            <Submenu
              submenu={item}
              closeAll={closeAll}
              tabReturnsToOpener={tabReturnsToOpener}
              backToParent={backToItem(index)}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

interface MenuItemButtonProps {
  readonly ref: Ref<HTMLButtonElement>
  readonly item: MenuItem
  readonly isSubmenuOpen: boolean
  readonly onClick: () => void
}

const checkedState = (item: MenuItem) => (isSubmenu(item) ? undefined : item.checked)

function MenuItemButton({ ref, item, isSubmenuOpen, onClick }: MenuItemButtonProps) {
  const checked = checkedState(item)
  return (
    <button
      ref={ref}
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      tabIndex={-1}
      aria-checked={checked}
      aria-haspopup={isSubmenu(item) ? "menu" : undefined}
      aria-expanded={isSubmenu(item) ? isSubmenuOpen : undefined}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-small px-3 py-2 text-left text-sm transition-colors duration-120 ease-out hover:bg-surface-raised focus:bg-surface-raised"
    >
      {item.label}
      {isSubmenu(item) ? <ChevronRight aria-hidden size={16} /> : null}
      {checked === true ? <Check aria-hidden size={16} /> : null}
    </button>
  )
}

interface SubmenuProps {
  readonly submenu: MenuSubmenu
  readonly closeAll: () => void
  readonly tabReturnsToOpener: boolean
  readonly backToParent: () => void
}

function Submenu({ submenu, closeAll, tabReturnsToOpener, backToParent }: SubmenuProps) {
  return (
    <div className="absolute top-0 left-full z-10 -mt-1 pl-1">
      <MenuList
        label={submenu.label}
        items={submenu.items}
        closeAll={closeAll}
        tabReturnsToOpener={tabReturnsToOpener}
        backToParent={backToParent}
      />
    </div>
  )
}

interface CloseActions {
  readonly closeAll: () => void
  readonly tabReturnsToOpener: boolean
  readonly backToParent: (() => void) | undefined
}

interface MenuNavigation {
  readonly items: ReadonlyArray<MenuItem>
  readonly itemRefs: RefObject<Array<HTMLButtonElement | null>>
  readonly openSubmenu: (index: number) => void
  readonly closeActions: CloseActions
}

function applyMenuKey(event: KeyboardEvent, navigation: MenuNavigation) {
  // App-wide shortcuts listen on the window, so they must get past the menu.
  if (hasShortcutModifier(event)) return
  // A submenu sits inside its parent menu, and the whole menu sits inside
  // the element that opened it in the React tree. Neither may act on a key
  // meant for this menu.
  event.stopPropagation()
  const focusedIndex = navigation.itemRefs.current.findIndex(
    (item) => item === document.activeElement,
  )
  const targetIndex = menuItemTargetForKey(event.key, focusedIndex, navigation.items.length)
  if (targetIndex !== undefined) {
    event.preventDefault()
    navigation.itemRefs.current[targetIndex]?.focus()
    return
  }
  const focusedItem = navigation.items[focusedIndex]
  if (event.key === "ArrowRight" && focusedItem !== undefined && isSubmenu(focusedItem)) {
    event.preventDefault()
    navigation.openSubmenu(focusedIndex)
    return
  }
  if (closeWithKey(event, navigation.closeActions)) {
    event.preventDefault()
  }
}

// Escape and the left arrow close a submenu and go back to its item; Escape
// closes the top menu too. Tab closes every level at once, unless it should
// go on to the next control, which the browser does by itself. Shift+Tab
// always goes back to the opener: a menu button comes just before its menu,
// so the browser would land on it and leave the menu open. Returns whether
// the menu handled the key.
const closeWithKey = (
  { key, shiftKey }: KeyboardEvent,
  { closeAll, tabReturnsToOpener, backToParent }: CloseActions,
): boolean => {
  if (key === "Tab") {
    const returnsToOpener = tabReturnsToOpener || shiftKey
    if (returnsToOpener) {
      closeAll()
    }
    return returnsToOpener
  }
  if (key !== "Escape" && key !== "ArrowLeft") {
    return false
  }
  if (backToParent) {
    backToParent()
    return true
  }
  if (key === "Escape") {
    closeAll()
  }
  return true
}
