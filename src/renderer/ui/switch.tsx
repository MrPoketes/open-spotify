import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "./class-names"

// shadcn/ui's Switch, restyled to docs/design.md (Switches): a 40 × 24 px rail
// that is the accent when on and muted when off, so the off rail still stands
// out from the surface it sits on.
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-120 ease-out data-checked:bg-primary data-unchecked:bg-muted data-disabled:cursor-default data-disabled:opacity-50 not-data-disabled:hover:opacity-90 not-data-disabled:active:opacity-75",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none size-4 rounded-full transition-transform duration-120 ease-out data-checked:translate-x-4 data-checked:bg-primary-foreground data-unchecked:bg-background"
      />
    </SwitchPrimitive.Root>
  )
}
