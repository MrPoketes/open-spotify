import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cn } from "./class-names"

// shadcn/ui's Toggle Group, restyled to docs/design.md (Toggle groups): the
// options sit in one pill. A pressed option turns to the foreground color
// with heavier text, so its state shows as a change of lightness and weight,
// not of hue alone.
export function ToggleGroup<Value extends string>({
  className,
  ...props
}: ToggleGroupPrimitive.Props<Value>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex w-fit gap-0.5 rounded-full bg-secondary p-0.5", className)}
      {...props}
    />
  )
}

export function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full px-3 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors duration-120 ease-out not-data-pressed:hover:text-foreground data-pressed:bg-foreground data-pressed:font-semibold data-pressed:text-background",
        className,
      )}
      {...props}
    />
  )
}
