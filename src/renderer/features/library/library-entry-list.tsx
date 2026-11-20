import { useRovingFocus } from "../../ui/use-roving-focus"
import type { LibraryEntry } from "./library-entries"
import { type LibraryEntryActions, LibraryEntryRow } from "./library-entry-row"

interface LibraryEntryListProps {
  readonly id?: string
  readonly entries: ReadonlyArray<LibraryEntry>
  readonly pinned: boolean
  readonly actions: LibraryEntryActions
}

export function LibraryEntryList({ id, entries, pinned, actions }: LibraryEntryListProps) {
  const { onKeyDown, rowProps } = useRovingFocus(entries.length)
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused entry, and the list moves focus between its entries: the roving focus docs/design.md requires for lists
    <ul id={id} onKeyDown={onKeyDown} className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.uri}>
          <LibraryEntryRow
            entry={entry}
            pinned={pinned}
            rovingProps={rowProps(index)}
            actions={actions}
          />
        </li>
      ))}
    </ul>
  )
}
