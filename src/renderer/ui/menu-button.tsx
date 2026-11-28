import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import type { LucideIcon } from "lucide-react"
import { useRef } from "react"
import { buttonVariants } from "./button-variants"
import { DropdownMenuContent } from "./dropdown-menu"
import { leaveShortcutsToTheWindow } from "./leave-shortcuts-to-the-window"
import { MenuItems, type MenuItem } from "./menu-items"
import { Tooltip } from "./tooltip"
import { useActionAfterMenuCloses } from "./use-action-after-menu-closes"

interface MenuButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly items: ReadonlyArray<MenuItem>
  // The edge of the button the menu lines up with. A button near the left
  // edge of a scrolling pane opens its menu rightward, so the pane does not
  // clip it.
  readonly menuAlignment?: "left" | "right"
}

const menuAlignments = { left: "start", right: "end" } as const

export function MenuButton({ label, icon: Icon, items, menuAlignment = "right" }: MenuButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { choose, runChosenAction } = useActionAfterMenuCloses(buttonRef)
  return (
    // Not modal, unlike Base UI's default: the page keeps scrolling, and a
    // click outside closes the menu and still reaches what it lands on.
    <MenuPrimitive.Root modal={false}>
      <Tooltip label={label}>
        <MenuPrimitive.Trigger
          ref={buttonRef}
          aria-label={label}
          onKeyDown={leaveShortcutsToTheWindow}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <Icon aria-hidden size={20} />
        </MenuPrimitive.Trigger>
      </Tooltip>
      <DropdownMenuContent
        aria-label={label}
        align={menuAlignments[menuAlignment]}
        finalFocus={runChosenAction}
      >
        <MenuItems items={items} onChoose={choose} />
      </DropdownMenuContent>
    </MenuPrimitive.Root>
  )
}
