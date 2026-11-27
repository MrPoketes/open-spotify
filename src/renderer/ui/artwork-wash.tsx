import type { ArtworkSource } from "./artwork"

interface ArtworkWashProps {
  // Widest first, the order Spotify lists image sizes in.
  readonly sources: ReadonlyArray<ArtworkSource>
}

// The artwork, blurred far past recognition, colors the top of the page and
// fades into the surface (docs/design.md, Artwork wash). It bleeds through the
// main view's padding (app-shell.tsx) to the edges of the sheet and up behind
// the floating top bar, and scrolls away with the page. The page's root must
// be positioned. The theme's artwork-wash token sets its strength, and a theme
// that sets it to 0 turns it off.
export function ArtworkWash({ sources }: ArtworkWashProps) {
  // Blurred, the smallest image looks the same as the largest.
  const smallestSource = sources.at(-1)
  if (smallestSource === undefined) {
    return null
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-8 -top-18 -z-10 h-96 overflow-hidden"
    >
      <img
        src={smallestSource.url}
        alt=""
        className="size-full scale-125 object-cover blur-3xl saturate-150 opacity-artwork-wash"
      />
      <div className="absolute inset-0 bg-linear-to-b from-transparent to-surface" />
    </div>
  )
}
