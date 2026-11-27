import type { ComponentProps } from "react"
import { cn } from "./class-names"

// shadcn/ui's Skeleton: a placeholder shaped like the content that is loading.
// It is decorative; the loading message beside it is what screen readers hear.
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn("animate-pulse rounded-medium bg-secondary", className)}
      {...props}
    />
  )
}
