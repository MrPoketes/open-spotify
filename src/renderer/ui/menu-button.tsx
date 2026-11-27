import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import type { LucideIcon } from "lucide-react"
import { buttonVariants } from "./button-variants"
import { DropdownMenuContent } from "./dropdown-menu"
import { leaveShortcutsToTheWindow } from "./leave-shortcuts-to-the-window"
import { MenuItems, type MenuItem } from "./menu-items"

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
  return (
    // Not modal, unlike Base UI's default: the page keeps scrolling, and a
    // click outside closes the menu and still reaches what it lands on.
    <MenuPrimitive.Root modal={false}>
      <MenuPrimitive.Trigger
        aria-label={label}
        title={label}
        onKeyDown={leaveShortcutsToTheWindow}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Icon aria-hidden size={20} />
      </MenuPrimitive.Trigger>
      <DropdownMenuContent aria-label={label} align={menuAlignments[menuAlignment]}>
        <MenuItems items={items} />
      </DropdownMenuContent>
    </MenuPrimitive.Root>
  )
}
