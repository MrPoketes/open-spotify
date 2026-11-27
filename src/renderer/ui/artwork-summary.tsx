import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Artwork, type ArtworkSource } from "./artwork"
import { cn } from "./class-names"

export interface SummaryArtwork {
  readonly sources: ReadonlyArray<ArtworkSource>
  readonly placeholderIcon: LucideIcon
  readonly placeholderColors?: string
  readonly round: boolean
}

// "lead" is what plays in the now-playing bar: a larger cover, lifted like the
// covers on a page, over a semibold title.
type SummarySize = "row" | "lead"

interface SummaryArtworkTileProps {
  readonly artwork: SummaryArtwork
  readonly size?: SummarySize
}

// The 40 px artwork of a library row, which the sidebar's icon rail shows on
// its own.
export function SummaryArtworkTile({ artwork, size = "row" }: SummaryArtworkTileProps) {
  const { round, ...artworkProps } = artwork
  return (
    <Artwork
      {...artworkProps}
      size={size === "lead" ? 56 : 40}
      className={cn(round ? "rounded-full" : "rounded-small", size === "lead" && "shadow-raised")}
    />
  )
}

interface ArtworkSummaryProps {
  readonly artwork: SummaryArtwork
  readonly title: ReactNode
  readonly details: ReactNode
  readonly size?: SummarySize
}

// The library row layout from docs/design.md: 40 px artwork beside the name and
// a muted line that says what the item is.
export function ArtworkSummary({ artwork, title, details, size = "row" }: ArtworkSummaryProps) {
  const isLead = size === "lead"
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SummaryArtworkTile artwork={artwork} size={size} />
      <div className={cn("flex min-w-0 flex-col", isLead && "gap-0.5")}>
        <span className={cn("truncate text-sm", isLead && "font-semibold")}>{title}</span>
        <span className="truncate text-xs text-muted">{details}</span>
      </div>
    </div>
  )
}
