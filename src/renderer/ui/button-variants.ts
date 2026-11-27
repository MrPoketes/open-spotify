import { cva } from "class-variance-authority"

// Button's looks, shared with links that look like buttons. The global
// :focus-visible outline in app.css stays the focus style, so the variants add
// no focus ring of their own. An aria-disabled button stays focusable and dims
// like a disabled one.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap transition-colors duration-120 ease-out select-none disabled:opacity-50 aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground not-disabled:not-aria-disabled:hover:bg-primary/85",
        secondary:
          "bg-secondary text-secondary-foreground not-disabled:not-aria-disabled:hover:bg-surface-overlay",
        outline:
          "border border-border text-foreground not-disabled:not-aria-disabled:hover:bg-surface-raised",
        ghost:
          "text-muted-foreground not-disabled:not-aria-disabled:hover:bg-surface-raised not-disabled:not-aria-disabled:hover:text-foreground aria-expanded:bg-surface-raised aria-expanded:text-foreground",
      },
      size: {
        default: "h-9 rounded-medium px-4",
        sm: "h-8 rounded-small px-3 text-xs",
        icon: "size-8 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
