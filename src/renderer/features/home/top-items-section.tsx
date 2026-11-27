import type { ReactNode } from "react"
import { HomeSection } from "./home-section"
import { LoadedContent } from "./loaded-content"
import { TimeRangeSwitch } from "./time-range-switch"
import { hasNoTopItems, type TopItems } from "./use-top-items"

interface TopItemsSectionProps<A> {
  readonly kind: "artists" | "tracks"
  readonly topItems: TopItems<A>
  readonly renderItems: (items: ReadonlyArray<A>, title: string) => ReactNode
}

export function TopItemsSection<A>({ kind, topItems, renderItems }: TopItemsSectionProps<A>) {
  if (hasNoTopItems(topItems)) {
    return null
  }
  const title = `Your top ${kind}`
  const timeRangeSwitch = (
    <TimeRangeSwitch
      label={`Time range for your top ${kind}`}
      timeRange={topItems.timeRange}
      onChange={topItems.showTimeRange}
    />
  )
  return (
    <HomeSection title={title} controls={timeRangeSwitch}>
      <LoadedContent
        state={topItems.state}
        loadingMessage={`Loading your top ${kind}…`}
        skeleton={kind === "artists" ? "cards" : "rows"}
        failureMessage={`Your top ${kind} didn't load.`}
        onRetry={topItems.retry}
      >
        {(items) =>
          items.length === 0 ? (
            <p className="text-muted">No top {kind} for this time range yet.</p>
          ) : (
            renderItems(items, title)
          )
        }
      </LoadedContent>
    </HomeSection>
  )
}
