import { Option } from "effect"

// Spotify's queue can hold the same item more than once, so a queued item is
// identified by its URI and how many times that URI comes before it.
export interface QueuedItem {
  readonly uri: string
  readonly occurrence: number
}

export const withOccurrences = <A extends { readonly uri: string }>(items: ReadonlyArray<A>) => {
  const timesSeen = new Map<string, number>()
  return items.map((item) => {
    const occurrence = timesSeen.get(item.uri) ?? 0
    timesSeen.set(item.uri, occurrence + 1)
    return { item, occurrence }
  })
}

export const positionInQueue = (
  upNext: ReadonlyArray<{ readonly uri: string }>,
  queuedItem: QueuedItem,
) => {
  const position = withOccurrences(upNext).findIndex(
    ({ item, occurrence }) => item.uri === queuedItem.uri && occurrence === queuedItem.occurrence,
  )
  return position === -1 ? Option.none() : Option.some(position)
}
