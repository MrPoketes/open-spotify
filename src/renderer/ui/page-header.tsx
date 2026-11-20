import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Artwork, type ArtworkSource } from "./artwork"

const coverSize = 192

interface PageCover {
  // Widest first, the order Spotify lists image sizes in.
  readonly sources: ReadonlyArray<ArtworkSource>
  readonly placeholderIcon: LucideIcon
  readonly placeholderColors?: string
}

interface PageHeaderProps {
  // What the page shows, such as "Playlist" or "Podcast".
  readonly kind: string
  readonly title: string
  readonly cover: PageCover
  // The lines under the title, such as a description and counts.
  readonly children: ReactNode
}

export function PageHeader({ kind, title, cover, children }: PageHeaderProps) {
  return (
    <header className="flex items-end gap-6">
      <Artwork {...cover} size={coverSize} className="rounded-medium shadow-raised" />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold text-muted">{kind}</p>
        <h1 className="font-display text-5xl font-bold break-words">{title}</h1>
        {children}
      </div>
    </header>
  )
}
