import type { LucideIcon } from "lucide-react"
import { type FocusEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react"
import { iconControlClassName } from "./icon-control-class-name"
import { menuItemTargetForKey } from "./menu-item-target"

export interface MenuAction {
  readonly label: string
  readonly onSelect: () => void
}

interface MenuButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly actions: ReadonlyArray<MenuAction>
}

// Where focus lands inside the menu when it opens, or null while it is closed.
type OpenMenu = { readonly focusIndex: number } | null

// Follows the WAI-ARIA menu button pattern: arrow keys move between items,
// Escape closes the menu and returns focus to the button.
export function MenuButton({ label, icon: Icon, actions }: MenuButtonProps) {
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)

  useEffect(() => {
    if (openMenu !== null) {
      itemRefs.current.at(openMenu.focusIndex)?.focus()
    }
  }, [openMenu])

  const closeAndFocusButton = () => {
    setOpenMenu(null)
    buttonRef.current?.focus()
  }

  const selectAction = (action: MenuAction) => {
    closeAndFocusButton()
    action.onSelect()
  }

  const openWithKeyboard = (event: KeyboardEvent) => {
    const focusIndexByKey: Record<string, number> = { ArrowDown: 0, ArrowUp: -1 }
    const focusIndex = focusIndexByKey[event.key]
    if (focusIndex === undefined) return
    event.preventDefault()
    setOpenMenu({ focusIndex })
  }

  const closeWhenFocusLeaves = (event: FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null)
  }

  return (
    <div className="relative" onBlur={closeWhenFocusLeaves}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={openMenu !== null}
        aria-controls={openMenu === null ? undefined : menuId}
        onClick={() => setOpenMenu(openMenu === null ? { focusIndex: 0 } : null)}
        onKeyDown={openWithKeyboard}
        className={iconControlClassName}
      >
        <Icon aria-hidden size={20} />
      </button>
      {openMenu !== null && (
        <ul
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={(event) => moveFocusWithKeyboard(event, itemRefs.current, closeAndFocusButton)}
          className="absolute top-full right-0 z-10 mt-1 flex min-w-48 flex-col rounded-large bg-surface-overlay p-1 shadow-overlay transition-[opacity,translate] duration-200 ease-out starting:-translate-y-2 starting:opacity-0"
        >
          {actions.map((action, index) => (
            <li key={action.label} role="none">
              <button
                ref={(item) => {
                  itemRefs.current[index] = item
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => selectAction(action)}
                className="w-full rounded-small px-3 py-2 text-left text-sm transition-colors duration-120 ease-out hover:bg-surface-raised focus:bg-surface-raised"
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const moveFocusWithKeyboard = (
  event: KeyboardEvent,
  items: ReadonlyArray<HTMLButtonElement | null>,
  closeAndFocusButton: () => void,
) => {
  if (event.key === "Escape") {
    event.preventDefault()
    closeAndFocusButton()
    return
  }
  const focusedIndex = items.findIndex((item) => item === document.activeElement)
  const targetIndex = menuItemTargetForKey(event.key, focusedIndex, items.length)
  if (targetIndex === undefined) return
  event.preventDefault()
  items[targetIndex]?.focus()
}
