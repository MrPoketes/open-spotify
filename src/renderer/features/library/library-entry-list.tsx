import { RovingList } from "../../ui/roving-list"
import type { LibraryEntry } from "./library-entries"
import { type LibraryEntryActions, LibraryEntryRow } from "./library-entry-row"

interface LibraryEntryListProps {
  readonly id?: string
  readonly entries: ReadonlyArray<LibraryEntry>
  readonly pinned: boolean
  readonly actions: LibraryEntryActions
}

export function LibraryEntryList({ id, entries, pinned, actions }: LibraryEntryListProps) {
  return (
    <RovingList
      id={id}
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
