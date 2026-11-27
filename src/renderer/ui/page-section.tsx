import { useId, type ReactNode } from "react"
import { Skeleton } from "./skeleton"

// The same height with or without controls, so side-by-side sections line up.
const headingRowClassName =
  "flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3"

interface PageSectionProps {
  readonly title: string
  // Shown at the right end of the heading, such as a time range switch.
  readonly controls?: ReactNode
  readonly children: ReactNode
}

// A section of a page: its heading sits over a hairline rule, like the rules
// that divide a sleeve's back (docs/design.md, Page sections).
export function PageSection({ title, controls, children }: PageSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <div className={headingRowClassName}>
        <h2 id={headingId} className="font-display text-xl font-bold tracking-tight">
          {title}
        </h2>
        {controls}
      </div>
      {children}
    </section>
  )
}

// Holds a section's place, heading and rule included, while a page does not
// yet know which sections it will have.
export function PageSectionSkeleton({ children }: { readonly children: ReactNode }) {
  return (
    <div aria-hidden className="flex min-w-0 flex-col gap-4">
      <div className={headingRowClassName}>
        <Skeleton className="h-5 w-28 rounded-small" />
      </div>
      {children}
    </div>
  )
}
