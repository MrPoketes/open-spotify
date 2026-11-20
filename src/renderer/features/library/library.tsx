import { Effect } from "effect"
import { useState } from "react"
import { defaultLibrarySections } from "../../../shared/library-layout"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { arrangeLibrary } from "./arrange-library"
import { HiddenLibrarySections } from "./hidden-library-sections"
import { type LibraryEntry, loadLibraryEntries } from "./library-entries"
import { LibraryFilterBar } from "./library-filter-bar"
import { filterLibraryEntries, hasLibraryFilters, noLibraryFilters } from "./library-filters"
import { LibrarySectionGroup, PinnedLibrarySection } from "./library-section-group"
import { type SavedLibraryLayout, useLibraryLayout } from "./use-library-layout"

const loadLibrary = Effect.all(
  {
    entries: loadLibraryEntries,
    pinnedUris: loadSavedSetting("pinnedLibraryEntries", []),
    sections: loadSavedSetting("librarySections", defaultLibrarySections),
  },
  { concurrency: "unbounded" },
)

export function Library() {
  const { state, retry } = useLoad(loadLibrary, "The library failed to load")

  if (state.status === "loading") {
    return <output className="px-2 text-sm text-muted">Loading your library…</output>
  }

  if (state.status === "failed") {
    return (
      <div className="px-2">
        <SpotifyLoadFailure
          error={state.error}
          message="Your library didn't load."
          onRetry={retry}
        />
      </div>
    )
  }

  if (state.value.entries.length === 0) {
    return (
      <p className="px-2 text-sm text-muted">
        Playlists, albums, artists, and shows you save will appear here.
      </p>
    )
  }

  const { entries, ...savedLayout } = state.value
  return <ArrangedLibraryView entries={entries} savedLayout={savedLayout} />
}

interface ArrangedLibraryViewProps {
  readonly entries: ReadonlyArray<LibraryEntry>
  readonly savedLayout: SavedLibraryLayout
}

function ArrangedLibraryView({ entries, savedLayout }: ArrangedLibraryViewProps) {
  const [filters, setFilters] = useState(noLibraryFilters)
  const layout = useLibraryLayout(savedLayout)
  const { pinnedEntries, shownSections } = arrangeLibrary(
    filterLibraryEntries(entries, filters),
    layout.pinnedUris,
    layout.sections,
  )
  const isEmpty = pinnedEntries.length === 0 && shownSections.length === 0
  const emptyMessage = hasLibraryFilters(filters)
    ? "Nothing in your library matches these filters."
    : "Everything in your library is in a hidden section."

  // The output stays mounted while entries show: screen readers only announce
  // changes to a live region that was already on the page.
  return (
    <div className="flex flex-col">
      <LibraryFilterBar filters={filters} onChange={setFilters} />
      <output className="px-2 text-sm text-muted">{isEmpty ? emptyMessage : ""}</output>
      {pinnedEntries.length > 0 && (
        <PinnedLibrarySection entries={pinnedEntries} entryActions={layout} />
      )}
      {shownSections.map(({ section, entries: sectionEntries }, index) => (
        <LibrarySectionGroup
          key={section.kind}
          section={section}
          entries={sectionEntries}
          menuActions={layout.sectionMenuActions(section, {
            previous: shownSections[index - 1]?.section,
            next: shownSections[index + 1]?.section,
          })}
          onToggleCollapsed={() => layout.toggleCollapsed(section)}
          entryActions={layout}
        />
      ))}
      <HiddenLibrarySections
        sections={layout.sections}
        onShow={layout.showSection}
        focusAfterChange={layout.focusAfterChange}
      />
    </div>
  )
}
