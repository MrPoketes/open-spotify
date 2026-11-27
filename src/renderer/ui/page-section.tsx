import { useId, type ReactNode } from "react"

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
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
        <h2 id={headingId} className="font-display text-xl font-bold tracking-tight">
          {title}
        </h2>
        {controls}
      </div>
      {children}
    </section>
  )
}
