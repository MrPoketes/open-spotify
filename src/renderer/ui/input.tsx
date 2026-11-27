import { Input as InputPrimitive } from "@base-ui/react/input"
import type { ComponentProps } from "react"
import { cn } from "./class-names"

// shadcn/ui's Input, restyled to docs/design.md (Text fields). Chromium's own
// clear button on search fields is hidden, since Escape clears them and the
// browser would draw it in its own colors.
export function Input({ className, ...props }: ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-medium bg-secondary px-3 text-sm text-secondary-foreground transition-colors duration-120 ease-out placeholder:text-muted-foreground hover:bg-surface-overlay aria-invalid:ring-2 aria-invalid:ring-destructive [&::-webkit-search-cancel-button]:appearance-none",
        className,
      )}
      {...props}
    />
  )
}
