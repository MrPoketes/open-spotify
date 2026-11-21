import type { LucideIcon } from "lucide-react"
import { type KeyboardEvent, useId, useRef, useState } from "react"
import { closeWhenFocusLeaves } from "./close-when-focus-leaves"
import { iconControlClassName } from "./icon-control-class-name"
import { type MenuItem, MenuList, type MenuOpenFocus } from "./menu-list"

interface MenuButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly items: ReadonlyArray<MenuItem>
  // The edge of the button the menu lines up with. A button near the left
  // edge of a scrolling pane opens its menu rightward, so the pane does not
  // clip it.
  readonly menuAlignment?: "left" | "right"
}

const menuAlignmentClassNames = { left: "left-0", right: "right-0" }

// Follows the WAI-ARIA menu button pattern: the arrow keys open the menu on
// its first or last item, Escape and Shift+Tab close it and return focus to
// the button, and Tab closes it and moves on.
export function MenuButton({ label, icon: Icon, items, menuAlignment = "right" }: MenuButtonProps) {
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // The item the menu opened on, or null while it is closed.
  const [menuOpenedOn, setMenuOpenedOn] = useState<MenuOpenFocus | null>(null)

  const closeAndFocusButton = () => {
    setMenuOpenedOn(null)
    buttonRef.current?.focus()
  }

  const openWithKeyboard = (event: KeyboardEvent) => {
    const openedOnByKey: Record<string, MenuOpenFocus> = { ArrowDown: "first", ArrowUp: "last" }
    const openedOn = openedOnByKey[event.key]
    if (openedOn === undefined) return
    event.preventDefault()
    setMenuOpenedOn(openedOn)
  }

  return (
    <div className="relative" onBlur={closeWhenFocusLeaves(() => setMenuOpenedOn(null))}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={menuOpenedOn !== null}
        aria-controls={menuOpenedOn === null ? undefined : menuId}
        onClick={() => setMenuOpenedOn(menuOpenedOn === null ? "first" : null)}
        onKeyDown={openWithKeyboard}
        className={iconControlClassName}
      >
        <Icon aria-hidden size={20} />
      </button>
      {menuOpenedOn !== null && (
        <div className={`absolute top-full z-10 mt-1 ${menuAlignmentClassNames[menuAlignment]}`}>
          <MenuList
            id={menuId}
            label={label}
            items={items}
            focusOnOpen={menuOpenedOn}
            closeAll={closeAndFocusButton}
          />
        </div>
      )}
    </div>
  )
}
