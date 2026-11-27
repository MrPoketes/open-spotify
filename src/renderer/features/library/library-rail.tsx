import type { ArrangedLibrary } from "./arrange-library"
import { LibraryEntryList } from "./library-entry-list"
import type { LibraryEntryActions } from "./library-entry-row"
import { librarySectionNames } from "./library-section-names"

interface LibraryRailProps extends ArrangedLibrary {
  readonly entryActions: LibraryEntryActions
}

// The icon rail has no room for headings or filters, so a hairline divides
// the groups and each list carries its section's name. Every shown section
// lists its entries, collapsed or not, since the rail has no heading to
// expand one with.
export function LibraryRail({ pinnedEntries, shownSections, entryActions }: LibraryRailProps) {
  const groups = [
    ...(pinnedEntries.length > 0 ? [{ name: "Pinned", entries: pinnedEntries, pinned: true }] : []),
    ...shownSections.map(({ section, entries }) => ({
      name: librarySectionNames[section.kind],
      entries,
      pinned: false,
    })),
  ]
  return groups.map(({ name, entries, pinned }) => (
    <div key={name} className="mt-2 border-t border-border pt-2">
      <LibraryEntryList label={name} entries={entries} pinned={pinned} actions={entryActions} />
    </div>
  ))
}
