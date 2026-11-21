import type { LibrarySection } from "../../../shared/library-layout"
import type { LibraryEntry } from "./library-entries"

interface ShownLibrarySection {
  readonly section: LibrarySection
  readonly entries: ReadonlyArray<LibraryEntry>
}

interface ArrangedLibrary {
  readonly pinnedEntries: ReadonlyArray<LibraryEntry>
  readonly shownSections: ReadonlyArray<ShownLibrarySection>
}

// Pinned entries leave their section for the top of the library. Pins of
// entries that are no longer saved are skipped, and so are sections that are
// hidden or have no entries left.
export const arrangeLibrary = (
  entries: ReadonlyArray<LibraryEntry>,
  pinnedUris: ReadonlyArray<string>,
  sections: ReadonlyArray<LibrarySection>,
): ArrangedLibrary => {
  const pinnedEntries = pinnedUris.flatMap((uri) => entries.filter((entry) => entry.uri === uri))
  const unpinnedEntries = entries.filter((entry) => !pinnedUris.includes(entry.uri))
  const shownSections = sections
    .filter((section) => !section.hidden)
    .map((section) => ({
      section,
      entries: unpinnedEntries.filter((entry) => entry.kind === section.kind),
    }))
    .filter((shownSection) => shownSection.entries.length > 0)
  return { pinnedEntries, shownSections }
}
