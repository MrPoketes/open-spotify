import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import type { ReactElement } from "react"

// It takes a trigger's props so that a wrapper rendering through it, such as
// a context menu, still reaches its element.
interface TooltipProps extends TooltipPrimitive.Trigger.Props {
  readonly label: string
  // A muted line under the label, such as what a rail entry is or why a
  // control cannot be used.
  readonly details?: string | null
  // The keys that run the control, such as "Ctrl+B", shown after the label.
  readonly shortcut?: string
  // The side it opens on when there is room there. Base UI flips it to the
  // opposite side near a window edge, so it never covers its element.
  readonly side?: "top" | "right"
  // A disabled tooltip keeps its trigger, so turning it on or off does not
  // remount the element and take its focus.
  readonly disabled?: boolean
  // The element the tooltip names. It keeps its own props, handlers, and
  // accessible name; the tooltip only shows that name.
  readonly children: ReactElement
}

// shadcn/ui's Tooltip, restyled to docs/design.md (Tooltips). Base UI opens it
// on hover and on keyboard focus.
export function Tooltip({
  label,
  details = null,
  shortcut,
  side = "top",
  disabled = false,
  children,
  ...triggerProps
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root
      disabled={disabled}
      onOpenChange={(open, change) => {
        // A tooltip opens by itself when focus lands on its element, such as a
        // dialog's Close button. Escape closes the tooltip and goes on to the
        // dialog or menu around it, so one press still closes that.
        if (!open && change.reason === "escape-key") {
          change.allowPropagation()
        }
      }}
    >
      <TooltipPrimitive.Trigger render={children} delay={300} {...triggerProps} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          side={side}
          sideOffset={8}
          collisionPadding={8}
          className="isolate z-50"
        >
          <TooltipPrimitive.Popup
            data-slot="tooltip-content"
            role="tooltip"
            className="flex max-w-64 flex-col rounded-small bg-popover px-2 py-1 text-xs text-popover-foreground shadow-overlay transition-opacity duration-120 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0"
          >
            <span className="flex items-baseline gap-2">
              <span className="font-semibold">{label}</span>
              {shortcut !== undefined && <span className="text-muted">{shortcut}</span>}
            </span>
            {details !== null && <span className="text-muted">{details}</span>}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
