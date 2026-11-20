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
  // In pixels, or "fill" to take the width of the container, as a card does.
  readonly size: number | "fill"
  readonly className: string
  readonly placeholderIcon: LucideIcon
  readonly placeholderColors?: string
}

const layoutFor = (size: number | "fill") => {
  if (size === "fill") {
    return {
      style: undefined,
      className: "aspect-square w-full",
      // The browser picks a source for the width the image is laid out at,
      // which it can do because the image loads lazily.
      sizes: "auto",
      placeholderIconSize: 48,
    }
  }
  return {
    style: { width: size, height: size },
    className: "",
    sizes: `${size}px`,
    placeholderIconSize: Math.max(16, Math.round(size / 3)),
  }
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
  const layout = layoutFor(size)

  if (widestSource === undefined || widestSource.url === failedUrl) {
    return (
      <span
        aria-hidden
        style={layout.style}
        className={`flex shrink-0 items-center justify-center ${layout.className} ${placeholderColors} ${className}`}
      >
        <PlaceholderIcon size={layout.placeholderIconSize} />
      </span>
    )
  }
  return (
    <img
      src={widestSource.url}
      srcSet={sourceSet(sources)}
      sizes={layout.sizes}
      alt=""
      loading="lazy"
      onError={() => setFailedUrl(widestSource.url)}
      style={layout.style}
      className={`shrink-0 object-cover ${layout.className} ${className}`}
    />
  )
}
