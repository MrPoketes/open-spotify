import { type ReactNode, useId } from "react"

interface HomeSectionProps {
  readonly title: string
  // Shown at the right end of the heading, such as a time range switch.
  readonly controls?: ReactNode
  readonly children: ReactNode
}

export function HomeSection({ title, controls, children }: HomeSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id={headingId} className="font-display text-xl font-bold">
          {title}
        </h2>
        {controls}
      </div>
      {children}
    </section>
  )
}
