import { useId, type ReactNode } from "react"

interface HomeSectionProps {
  readonly title: string
  // Shown at the right end of the heading, such as a time range switch.
  readonly controls?: ReactNode
  readonly children: ReactNode
}

export function HomeSection({ title, controls, children }: HomeSectionProps) {
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
