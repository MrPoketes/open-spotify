import type { ReactNode } from "react"
import { AppMark } from "./app-mark"

const sheetWidthClassNames = {
  narrow: "max-w-md",
  wide: "max-w-xl",
}

interface BeforeLoginSheetProps {
  readonly width: keyof typeof sheetWidthClassNames
  readonly title: string
  readonly description: ReactNode
  readonly children: ReactNode
}

// Onboarding and login come before the app's panes exist, so each is one sheet
// on the canvas (docs/design.md, Before login).
export function BeforeLoginSheet({ width, title, description, children }: BeforeLoginSheetProps) {
  const widthClassName = sheetWidthClassNames[width]
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <section
        className={`relative isolate flex w-full flex-col gap-6 overflow-hidden rounded-large bg-surface p-8 shadow-raised ${widthClassName}`}
      >
        {/* No artwork exists before login, so the app's own accent colors the
            top of the sheet where a page's artwork wash would. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 -z-10 size-80 rounded-full bg-accent blur-3xl opacity-artwork-wash"
        />
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <AppMark className="size-10 shrink-0" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-balance">{title}</h1>
          </div>
          {description}
        </header>
        {children}
      </section>
      <p className={`w-full text-center text-xs text-pretty text-muted ${widthClassName}`}>
        Open Spotify is an unofficial client. It is not affiliated with, endorsed by, or sponsored
        by Spotify.
      </p>
    </main>
  )
}
