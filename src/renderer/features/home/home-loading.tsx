import { cardGridClassNames } from "../../ui/card-grid-class-names"
import { Skeleton } from "../../ui/skeleton"

const placeholderKeys = (count: number) => Array.from({ length: count }, (_, index) => index)

// Shaped like what each Home section shows once it loads, so the page keeps
// its layout instead of jumping when the content arrives.
const homeSkeletons = {
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
  cards: (
    <div className={cardGridClassNames.cards}>
      {placeholderKeys(5).map((key) => (
        <Skeleton key={key} className="aspect-square rounded-full" />
      ))}
    </div>
  ),
}

export type HomeSkeleton = keyof typeof homeSkeletons

interface HomeLoadingProps {
  readonly message: string
  readonly skeleton: HomeSkeleton
}

// Screen readers hear the message; everyone else sees the skeleton.
export function HomeLoading({ message, skeleton }: HomeLoadingProps) {
  return (
    <>
      <output className="sr-only">{message}</output>
      {homeSkeletons[skeleton]}
    </>
  )
}
