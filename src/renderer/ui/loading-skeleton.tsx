import { cardGridClassNames } from "./card-grid-class-names"
import { Skeleton } from "./skeleton"

const placeholderKeys = (count: number) => Array.from({ length: count }, (_, index) => index)

const cardSkeletons = (artworkClassName: string) => (
  <div className={cardGridClassNames.cards}>
    {placeholderKeys(5).map((key) => (
      <Skeleton key={key} className={`aspect-square ${artworkClassName}`} />
    ))}
  </div>
)

// Shaped like the content that is loading, so the page keeps its layout
// instead of jumping when the content arrives.
const skeletons = {
  tiles: (
    <div className={cardGridClassNames.tiles}>
      {placeholderKeys(8).map((key) => (
        <Skeleton key={key} className="h-16" />
      ))}
    </div>
  ),
  rows: (
    <div className="flex flex-col gap-2">
      {placeholderKeys(5).map((key) => (
        <Skeleton key={key} className="h-10 rounded-small" />
      ))}
    </div>
  ),
  // Artists have round artwork, everything else square (docs/design.md, Radii).
  roundCards: cardSkeletons("rounded-full"),
  squareCards: cardSkeletons("rounded-medium"),
}

export type SkeletonShape = keyof typeof skeletons

export function ContentSkeleton({ shape }: { readonly shape: SkeletonShape }) {
  return skeletons[shape]
}

interface LoadingSkeletonProps {
  readonly message: string
  readonly shape: SkeletonShape
}

// Screen readers hear the message; everyone else sees the skeleton.
export function LoadingSkeleton({ message, shape }: LoadingSkeletonProps) {
  return (
    <>
      <output className="sr-only">{message}</output>
      <ContentSkeleton shape={shape} />
    </>
  )
}
