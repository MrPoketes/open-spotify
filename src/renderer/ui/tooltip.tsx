import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import type { ReactElement } from "react"

interface TooltipProps extends TooltipPrimitive.Trigger.Props {
  readonly label: string
  readonly details: string
  // A disabled tooltip keeps its trigger, so turning it on or off does not
  // remount the element and take its focus.
  readonly disabled: boolean
  // The element the tooltip names. It keeps its own props, handlers, and
  // accessible name; the tooltip only shows that name.
  readonly children: ReactElement
}

// shadcn/ui's Tooltip, restyled to docs/design.md (Tooltips). Base UI opens it
// on hover and on keyboard focus, and it opens to the right, away from the
// sidebar's edge.
export function Tooltip({ label, details, disabled, children, ...triggerProps }: TooltipProps) {
  return (
    <TooltipPrimitive.Root disabled={disabled}>
      <TooltipPrimitive.Trigger render={children} delay={300} {...triggerProps} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="right" className="isolate z-50">
          <TooltipPrimitive.Popup
            data-slot="tooltip-content"
            className="ml-2 flex max-w-64 flex-col rounded-small bg-popover px-2 py-1 text-xs text-popover-foreground shadow-overlay transition-opacity duration-120 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0"
          >
            <span className="font-semibold">{label}</span>
            <span className="text-muted">{details}</span>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
