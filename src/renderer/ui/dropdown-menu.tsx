import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "./class-names"
import { leaveShortcutsToTheWindow } from "./leave-shortcuts-to-the-window"
import { menuRowClassName } from "./menu-row-class-name"

// shadcn/ui's Dropdown Menu, restyled to docs/design.md (Menus). Base UI
// builds its Context Menu from the same Menu parts, so context menus use
// these too (see context-menu.tsx).

type DropdownMenuContentProps = MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side">

// The gap between a menu and its button is a margin, rather than Base UI's
// offset in pixels, so it follows the theme's spacing step.
export function DropdownMenuContent({
  align,
  side,
  className,
  onKeyDown,
  ...props
}: DropdownMenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} side={side} className="isolate z-50">
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          onKeyDown={(event) => {
            leaveShortcutsToTheWindow(event)
            onKeyDown?.(event)
          }}
          className={cn(
            "flex max-h-(--available-height) min-w-48 flex-col overflow-y-auto rounded-large bg-popover p-1 text-popover-foreground shadow-overlay transition-[opacity,translate] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:opacity-0 data-[side=bottom]:mt-1 data-[side=top]:mb-1",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

// Base UI highlights the item under the pointer or keyboard focus, and the
// item whose submenu is open.
const itemClassName = cn(
  menuRowClassName,
  "cursor-default justify-between text-sm select-none data-highlighted:bg-surface-raised data-popup-open:bg-surface-raised [&_svg]:pointer-events-none [&_svg]:shrink-0",
)

export function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(itemClassName, className)}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(itemClassName, className)}
      {...props}
    >
      {children}
      <MenuPrimitive.CheckboxItemIndicator>
        <Check aria-hidden size={16} />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(itemClassName, className)}
      {...props}
    >
      {children}
      <ChevronRight aria-hidden size={16} />
    </MenuPrimitive.SubmenuTrigger>
  )
}

// A submenu opens beside its item, its first item level with that item.
export function DropdownMenuSubContent(props: MenuPrimitive.Popup.Props) {
  return (
    <DropdownMenuContent
      side="inline-end"
      align="start"
      className="-mt-1 data-[side=inline-end]:ms-1 data-[side=inline-start]:me-1"
      {...props}
    />
  )
}
