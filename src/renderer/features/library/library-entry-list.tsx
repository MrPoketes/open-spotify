import { RovingList } from "../../ui/roving-list"
import type { LibraryEntry } from "./library-entries"
import { LibraryEntryRow, type LibraryEntryActions } from "./library-entry-row"

interface LibraryEntryListProps {
  readonly id?: string
  // Names the list where no heading does, as in the sidebar's icon rail.
  readonly label?: string
  readonly entries: ReadonlyArray<LibraryEntry>
  readonly pinned: boolean
  readonly actions: LibraryEntryActions
}

export function LibraryEntryList({ id, label, entries, pinned, actions }: LibraryEntryListProps) {
  return (
    <RovingList
      id={id}
      label={label}
      rows={entries}
      rowKey={(entry) => entry.uri}
      className="flex flex-col"
      renderRow={(entry, rovingProps) => (
        <LibraryEntryRow
          entry={entry}
          pinned={pinned}
          rovingProps={rovingProps}
          actions={actions}
        />
      )}
    />
  )
}
