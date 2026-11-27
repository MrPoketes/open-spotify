import type { ReactNode } from "react"

// The queue is numbered like a tracklist: each row's place in it, or an icon
// in that place, right-aligned in a narrow column before the artwork. The list
// already tells screen readers where a row is, so the number is hidden from
// them.
export function QueuePosition({ children }: { readonly children: ReactNode }) {
  return (
    <span aria-hidden className="flex w-5 shrink-0 justify-end text-xs text-muted tabular-nums">
      {children}
    </span>
  )
}
