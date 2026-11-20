import type { LucideIcon } from "lucide-react"
import { useState } from "react"

export interface ArtworkSource {
  readonly url: string
  readonly width: number | null
}

// With srcset the browser fetches the smallest source that is sharp at the
// displayed size on the current screen, instead of the largest one for every
// row.
const sourceSet = (sources: ReadonlyArray<ArtworkSource>) =>
  sources.flatMap(({ url, width }) => (width === null ? [] : [`${url} ${width}w`])).join(", ")

interface ArtworkProps {
  // Widest first, the order Spotify lists image sizes in.
  readonly sources: ReadonlyArray<ArtworkSource>
  readonly size: number
  readonly className: string
  readonly placeholderIcon: LucideIcon
  readonly placeholderColors?: string
}

// Decorative: whatever the artwork belongs to carries the accessible name.
export function Artwork({
  sources,
  size,
  className,
  placeholderIcon: PlaceholderIcon,
  placeholderColors = "bg-surface-raised text-muted",
}: ArtworkProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [widestSource] = sources
  const dimensions = { width: size, height: size }

  if (widestSource === undefined || widestSource.url === failedUrl) {
    return (
      <span
        aria-hidden
        style={dimensions}
        className={`flex shrink-0 items-center justify-center ${placeholderColors} ${className}`}
      >
        <PlaceholderIcon size={Math.max(16, Math.round(size / 3))} />
      </span>
    )
  }
  return (
    <img
      src={widestSource.url}
      srcSet={sourceSet(sources)}
      sizes={`${size}px`}
      alt=""
      loading="lazy"
      onError={() => setFailedUrl(widestSource.url)}
      style={dimensions}
      className={`shrink-0 object-cover ${className}`}
    />
  )
}
