import type { ArtworkSource } from "./artwork"

const placementClassNames = {
  // Bleeds through the main view's padding to the edges of the sheet (px-8 in
  // app-shell.tsx) and up behind the floating top bar, fades into the sheet
  // below, and scrolls away with the page. Its parent must start at the top of
  // the page.
  page: "-inset-x-8 -top-(--main-view-content-top) h-96 mask-b-from-0%",
  // Sits behind what plays at the start of the now-playing bar, and fades into
  // the canvas to the right and above it.
  nowPlaying: "inset-y-0 left-0 w-1/3 mask-r-from-0% mask-t-from-50%",
}

interface ArtworkWashProps {
  // Widest first, the order Spotify lists image sizes in.
  readonly sources: ReadonlyArray<ArtworkSource>
  readonly placement: keyof typeof placementClassNames
}

// The artwork, blurred far past recognition, lets the music color what is
// around it (docs/design.md, Artwork wash). Its parent must be positioned. The
// theme's artwork-wash token sets its strength, and a theme that sets it to 0
// turns it off.
export function ArtworkWash({ sources, placement }: ArtworkWashProps) {
  // Blurred, the smallest image looks the same as the largest.
  const smallestSource = sources.at(-1)
  if (smallestSource === undefined) {
    return null
  }
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -z-10 overflow-hidden ${placementClassNames[placement]}`}
    >
      <img
        src={smallestSource.url}
        alt=""
        className="size-full scale-125 object-cover blur-3xl saturate-150 opacity-artwork-wash"
      />
    </div>
  )
}
