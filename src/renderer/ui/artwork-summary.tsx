import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Artwork, type ArtworkSource } from "./artwork"

export interface SummaryArtwork {
  readonly sources: ReadonlyArray<ArtworkSource>
  readonly placeholderIcon: LucideIcon
  readonly placeholderColors?: string
  readonly round: boolean
}

interface ArtworkSummaryProps {
  readonly artwork: SummaryArtwork
  readonly title: ReactNode
  readonly details: ReactNode
}

// The 40 px artwork of a library row, which the sidebar's icon rail shows on
// its own.
export function SummaryArtworkTile({ artwork }: { readonly artwork: SummaryArtwork }) {
  const { round, ...artworkProps } = artwork
  return (
    <Artwork {...artworkProps} size={40} className={round ? "rounded-full" : "rounded-small"} />
  )
}

// The library row layout from docs/design.md: 40 px artwork beside the name and
// a muted line that says what the item is.
export function ArtworkSummary({ artwork, title, details }: ArtworkSummaryProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SummaryArtworkTile artwork={artwork} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm">{title}</span>
        <span className="truncate text-xs text-muted">{details}</span>
      </div>
    </div>
  )
}
