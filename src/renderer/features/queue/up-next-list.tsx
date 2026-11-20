import { useRovingFocus } from "../../ui/use-roving-focus"
import { PlayableItemSummary } from "../playback/playable-item-summary"
import { usePlayerCommand } from "../playback/use-player-command"
import type { PlayableItem } from "../spotify/spotify-playable-item"

// The queue can hold the same item twice, so a row is identified by its URI
// and how many times that URI comes before it.
const withOccurrences = (items: ReadonlyArray<PlayableItem>) => {
  const timesSeen = new Map<string, number>()
  return items.map((item) => {
    const occurrence = timesSeen.get(item.uri) ?? 0
    timesSeen.set(item.uri, occurrence + 1)
    return { item, occurrence }
  })
}

interface UpNextListProps {
  readonly items: ReadonlyArray<PlayableItem>
}

// Spotify cannot remove or reorder queued items, so a row only plays its item.
export function UpNextList({ items }: UpNextListProps) {
  const { failure, isSending, send } = usePlayerCommand()
  const { onKeyDown, rowProps } = useRovingFocus(items.length)

  // Each press would skip again from where the first one left off, so a
  // double-click or a second row pressed meanwhile is ignored.
  const play = (item: PlayableItem, occurrence: number) => {
    if (isSending) {
      return
    }
    send((player) => player.playQueuedItem(item.uri, occurrence), `Couldn't play ${item.name}.`)
  }

  if (items.length === 0) {
    return <p className="px-2 text-sm text-muted">Nothing plays after this.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {withOccurrences(items).map(({ item, occurrence }, index) => (
          <li key={`${item.uri} ${occurrence}`}>
            <button
              type="button"
              {...rowProps(index)}
              title={`Play ${item.name}`}
              onKeyDown={onKeyDown}
              onClick={() => play(item, occurrence)}
              className="flex w-full rounded-small px-2 py-1 text-left transition-colors duration-120 ease-out hover:bg-surface-raised"
            >
              <PlayableItemSummary item={item} />
            </button>
          </li>
        ))}
      </ul>
      {failure !== null && (
        <p role="alert" className="px-2 text-xs text-danger">
          {failure}
        </p>
      )}
    </div>
  )
}
