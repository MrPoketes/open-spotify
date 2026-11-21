import type { LucideIcon } from "lucide-react"
import { type KeyboardEvent, useId, useRef, useState } from "react"
import { closeWhenFocusLeaves } from "./close-when-focus-leaves"
import { iconControlClassName } from "./icon-control-class-name"
import { type MenuAction, MenuList, type MenuOpenFocus } from "./menu-list"

interface MenuButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly actions: ReadonlyArray<MenuAction>
}

// Follows the WAI-ARIA menu button pattern: the arrow keys open the menu on
// its first or last item, and closing it returns focus to the button.
export function MenuButton({ label, icon: Icon, actions }: MenuButtonProps) {
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Null while the menu is closed.
  const [openFocus, setOpenFocus] = useState<MenuOpenFocus | null>(null)

  const closeAndFocusButton = () => {
    setOpenFocus(null)
    buttonRef.current?.focus()
  }

  const openWithKeyboard = (event: KeyboardEvent) => {
    const openFocusByKey: Record<string, MenuOpenFocus> = { ArrowDown: "first", ArrowUp: "last" }
    const focus = openFocusByKey[event.key]
    if (focus === undefined) return
    event.preventDefault()
    setOpenFocus(focus)
  }

  return (
    <div className="relative" onBlur={closeWhenFocusLeaves(() => setOpenFocus(null))}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={openFocus !== null}
        aria-controls={openFocus === null ? undefined : menuId}
        onClick={() => setOpenFocus(openFocus === null ? "first" : null)}
        onKeyDown={openWithKeyboard}
        className={iconControlClassName}
      >
        <Icon aria-hidden size={20} />
      </button>
      {openFocus !== null && (
        <div className="absolute top-full right-0 z-10 mt-1">
          <MenuList
            id={menuId}
            label={label}
            items={actions}
            focusOnOpen={openFocus}
            closeAll={closeAndFocusButton}
          />
        </div>
      )}
    </div>
  )
}
