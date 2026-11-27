import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "./class-names"
import { menuRowClassName } from "./menu-row-class-name"

// shadcn/ui's Select, restyled to docs/design.md (Text fields, Menus): the
// trigger looks like an input, and the list opens as an Overlay panel with the
// chosen option over the trigger.

export const Select = SelectPrimitive.Root

export function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 items-center justify-between gap-2 rounded-medium bg-secondary pr-2 pl-3 text-sm whitespace-nowrap text-secondary-foreground transition-colors duration-120 ease-out select-none hover:bg-surface-overlay data-popup-open:bg-surface-overlay",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-muted">
        <ChevronDown aria-hidden size={16} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export const SelectValue = SelectPrimitive.Value

export function SelectContent({ className, children, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner className="isolate z-50">
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-large bg-popover p-1 text-popover-foreground shadow-overlay transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        menuRowClassName,
        "cursor-default justify-between text-sm select-none data-highlighted:bg-surface-raised",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check aria-hidden size={16} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}
