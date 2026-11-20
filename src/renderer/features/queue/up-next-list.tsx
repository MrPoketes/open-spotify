import { useRovingFocus } from "../../ui/use-roving-focus"
import { PlayableItemSummary } from "../playback/playable-item-summary"
import { usePlayerCommand } from "../playback/use-player-command"
import type { PlayableItem } from "../spotify/spotify-playable-item"

// The queue can hold the same item twice, so each key counts how many times
// its item came before.
const rowKeys = (items: ReadonlyArray<PlayableItem>) => {
  const timesSeen = new Map<string, number>()
  return items.map(({ uri }) => {
    const occurrence = timesSeen.get(uri) ?? 0
    timesSeen.set(uri, occurrence + 1)
    return `${uri} ${occurrence}`
  })
}

interface UpNextListProps {
  readonly items: ReadonlyArray<PlayableItem>
}

// Spotify cannot remove or reorder queued items, so a row only plays its item.
export function UpNextList({ items }: UpNextListProps) {
  const { failure, send } = usePlayerCommand()
  const { onKeyDown, rowProps } = useRovingFocus(items.length)
  const keys = rowKeys(items)

  if (items.length === 0) {
    return <p className="px-2 text-sm text-muted">Nothing plays after this.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {items.map((item, index) => (
          <li key={keys[index]}>
            <button
              type="button"
              {...rowProps(index)}
              title={`Play ${item.name}`}
              onKeyDown={onKeyDown}
              onClick={() =>
                send((player) => player.skipAhead(index + 1), `Couldn't play ${item.name}.`)
              }
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
