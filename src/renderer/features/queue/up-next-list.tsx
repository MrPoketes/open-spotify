import { useRovingFocus } from "../../ui/use-roving-focus"
import { PlayableItemSummary } from "../playback/playable-item-summary"
import { withOccurrences } from "../playback/queued-item"
import { usePlayerCommand } from "../playback/use-player-command"
import type { PlayableItem } from "../spotify/spotify-playable-item"

interface UpNextListProps {
  readonly items: ReadonlyArray<PlayableItem>
  readonly playingUri: string | null
}

// Spotify cannot remove or reorder queued items, so a row only plays its item.
export function UpNextList({ items, playingUri }: UpNextListProps) {
  const { failure, isSending, send } = usePlayerCommand()
  const { onKeyDown, rowProps } = useRovingFocus(items.length)

  // Each press would skip again from where the first one left off, so a
  // double-click or a second row pressed meanwhile is ignored.
  const play = (item: PlayableItem, occurrence: number) => {
    if (isSending) {
      return
    }
    send(
      (player) => player.playQueuedItem({ uri: item.uri, occurrence }, playingUri),
      `Couldn't play ${item.name}.`,
    )
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
