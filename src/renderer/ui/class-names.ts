import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge knows Tailwind's default scales only, so the theme's own
// radius, shadow, and font names are added for it to tell, say, that a
// caller's rounded-full overrides a component's rounded-medium.
const mergeTailwindClasses = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["small", "medium", "large"],
      shadow: ["raised", "overlay"],
      font: ["body", "display"],
    },
  },
})

// shadcn/ui's `cn`: joins class names and lets a later Tailwind class override
// an earlier one for the same property, so a caller's className wins over a
// component's own.
export function cn(...classNames: Array<ClassValue>) {
  return mergeTailwindClasses(clsx(classNames))
}
