import { useLayoutEffect, useRef, useState } from "react"
import { useRovingFocus } from "../../ui/use-roving-focus"
import { PlayableItemSummary } from "../playback/playable-item-summary"
import { withOccurrences } from "../playback/queued-item"
import { usePlayerCommand } from "../playback/use-player-command"
import type { PlayableItem } from "../spotify/spotify-playable-item"

interface UpNextListProps {
  readonly items: ReadonlyArray<PlayableItem>
}

// Spotify cannot remove or reorder queued items, so a row only plays its item.
export function UpNextList({ items }: UpNextListProps) {
  const { failure, isSending, send } = usePlayerCommand()
  const { onKeyDown, rowProps, focusRow } = useRovingFocus(items.length)
  const [pressedItems, setPressedItems] = useState<ReadonlyArray<PlayableItem> | null>(null)
  const pressedRowIndex = useRef<number | null>(null)
  const list = useRef<HTMLUListElement>(null)

  // A row points into the list it was shown in, which the queue leaves behind
  // once a press plays an item. Until the queue read after that press arrives,
  // a second click of a double-click would skip again from the wrong place.
  // A list can also arrive while a press is still skipping, if a poll sees the
  // playing item change partway, and a press on it would add its skips to the
  // ones still being sent.
  const ignoresPresses = isSending || pressedItems === items

  // The pressed row moves to "Now playing" once its item plays, which would
  // drop keyboard focus onto the page body.
  useLayoutEffect(() => {
    const rowIndex = pressedRowIndex.current
    if (rowIndex === null || pressedItems === items) {
      return
    }
    pressedRowIndex.current = null
    const focused = document.activeElement
    if (focused === document.body || list.current?.contains(focused) === true) {
      focusRow(rowIndex)
    }
  })

  const play = (item: PlayableItem, occurrence: number, rowIndex: number) => {
    if (ignoresPresses) {
      return
    }
    setPressedItems(items)
    pressedRowIndex.current = rowIndex
    send(
      (player) => player.playQueuedItem({ uri: item.uri, occurrence }),
      `Couldn't play ${item.name}.`,
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <p className="px-2 text-sm text-muted">Nothing plays after this.</p>
      ) : (
        <ul ref={list} aria-busy={ignoresPresses} className="flex flex-col">
          {withOccurrences(items).map(({ item, occurrence }, index) => (
            <li key={`${item.uri} ${occurrence}`}>
              <button
                type="button"
                {...rowProps(index)}
                title={`Play ${item.name}`}
                onKeyDown={onKeyDown}
                onClick={() => play(item, occurrence, index)}
                className="flex w-full rounded-small px-2 py-1 text-left transition-colors duration-120 ease-out hover:bg-surface-raised"
              >
                <PlayableItemSummary item={item} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {failure !== null && (
        <p role="alert" className="px-2 text-xs text-danger">
          {failure}
        </p>
      )}
    </div>
  )
}
