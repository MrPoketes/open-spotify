import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"
import type { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { useRef, type FocusEvent, type KeyboardEvent, type ReactElement } from "react"
import { openedContextMenu, type ContextMenuContent } from "./context-menu-content"
import { DropdownMenuContent } from "./dropdown-menu"
import { MenuItems } from "./menu-items"
import { useActionAfterMenuCloses } from "./use-action-after-menu-closes"

interface ContextMenuProps {
  readonly menu: ContextMenuContent | null
  // The element the menu opens from. It keeps its own props and handlers.
  readonly children: ReactElement
}

const isMenuKey = (event: KeyboardEvent) =>
  event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")

// Base UI's Context Menu, drawn with shadcn/ui's Dropdown Menu parts: opens at
// the pointer on right-click, or under the element on Shift+F10 or the
// context-menu key, and returns focus to the element when it closes.
export function ContextMenu({ menu, children }: ContextMenuProps) {
  const menuActions = useRef<MenuPrimitive.Root.Actions>(null)
  const openedWithKeyboard = useRef(false)
  const opener = useRef<HTMLElement>(null)
  const { choose, runChosenAction } = useActionAfterMenuCloses(opener)
  const shownMenu = openedContextMenu(menu)

  // Base UI opens the menu on the contextmenu event, which a key press does
  // not reliably fire: jsdom never does, and a browser fires it at a point of
  // its own choosing. So the key is cancelled and the event fired under the
  // element.
  const openWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (shownMenu === null || !isMenuKey(event)) {
      return
    }
    event.preventDefault()
    const { left, bottom } = event.currentTarget.getBoundingClientRect()
    event.currentTarget.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: left, clientY: bottom }),
    )
    // Set after the event, whose handler clears the flag for a right-click.
    openedWithKeyboard.current = true
  }

  // Base UI focuses the menu itself when it opens, as it does for a menu
  // button's menu opened with the pointer. Opened from the keyboard, focus
  // starts on the first item instead, as in a menu button's menu opened with a
  // key. Only the focus that opening brings moves on: the menu takes focus
  // again whenever the pointer leaves an item.
  const focusFirstItemAfterKey = (event: FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !openedWithKeyboard.current) {
      return
    }
    openedWithKeyboard.current = false
    event.currentTarget.querySelector<HTMLElement>("[role^=menuitem]")?.focus()
  }

  // The menu is modal, so Base UI keeps Tab inside it. It is portalled to the
  // end of the page, so letting Tab go on from it would skip everything after
  // its element anyway: Tab and Shift+Tab close it instead.
  const closeOnTab = (event: KeyboardEvent) => {
    if (event.key !== "Tab") {
      return
    }
    event.preventDefault()
    menuActions.current?.close()
  }

  // An element keeps the same Root and Trigger whether or not it has a menu,
  // so it is not remounted, and does not lose focus, when its menu arrives,
  // such as a track row whose track has just loaded. Without a menu, the
  // disabled Root leaves a right-click to do what it does anywhere else.
  return (
    <ContextMenuPrimitive.Root actionsRef={menuActions} disabled={shownMenu === null}>
      <ContextMenuPrimitive.Trigger
        ref={(element: HTMLElement | null) => {
          opener.current = element
        }}
        render={children}
        onContextMenu={() => {
          openedWithKeyboard.current = false
        }}
        onKeyDown={openWithKeyboard}
      />
      {shownMenu === null ? null : (
        <DropdownMenuContent
          aria-label={shownMenu.label}
          onFocus={focusFirstItemAfterKey}
          finalFocus={runChosenAction}
          onKeyDown={closeOnTab}
        >
          <MenuItems items={shownMenu.items} onChoose={choose} />
        </DropdownMenuContent>
      )}
    </ContextMenuPrimitive.Root>
  )
}
