import { Effect } from "effect"
import { useState } from "react"
import { defaultLibrarySections } from "../../../shared/library-layout"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { LoadingMessage } from "../../ui/loading-message"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { arrangeLibrary } from "./arrange-library"
import { HiddenLibrarySections } from "./hidden-library-sections"
import { loadLibraryEntries, type LibraryEntry } from "./library-entries"
import { LibraryFilterBar } from "./library-filter-bar"
import { filterLibraryEntries, hasLibraryFilters, noLibraryFilters } from "./library-filters"
import { useLibraryPlaylists, type LibraryPlaylistsLoad } from "./library-playlists"
import { LibrarySectionGroup, PinnedLibrarySection } from "./library-section-group"
import { nameFilterFocusKey } from "./use-focus-after-change"
import { useLibraryLayout, type SavedLibraryLayout } from "./use-library-layout"

const loadLibrary = (loadPlaylists: LibraryPlaylistsLoad) =>
  Effect.all(
    {
      entries: loadLibraryEntries(loadPlaylists),
      pinnedUris: loadSavedSetting("pinnedLibraryEntries", []),
      sections: loadSavedSetting("librarySections", defaultLibrarySections),
    },
    { concurrency: "unbounded" },
  )

export function Library() {
  const { state, retry } = useLoad(loadLibrary(useLibraryPlaylists()), "The library failed to load")

  if (state.status === "loading") {
    return (
      <div className="px-2">
        <LoadingMessage>Loading your library…</LoadingMessage>
      </div>
    )
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

// The library is not empty here, so when nothing shows, either the filters
// match nothing or every match is in a hidden section.
const emptyLibraryMessage = (hasMatches: boolean, isFiltered: boolean) => {
  if (!hasMatches) return "Nothing in your library matches these filters."
  if (isFiltered) return "Everything that matches these filters is in a hidden section."
  return "Everything in your library is in a hidden section."
}

interface ArrangedLibraryViewProps {
  readonly entries: ReadonlyArray<LibraryEntry>
  readonly savedLayout: SavedLibraryLayout
}

function ArrangedLibraryView({ entries, savedLayout }: ArrangedLibraryViewProps) {
  const [filters, setFilters] = useState(noLibraryFilters)
  const layout = useLibraryLayout(savedLayout)
  const matchingEntries = filterLibraryEntries(entries, filters)
  const { pinnedEntries, shownSections } = arrangeLibrary(
    matchingEntries,
    layout.pinnedUris,
    layout.sections,
  )
  const isEmpty = pinnedEntries.length === 0 && shownSections.length === 0
  const entryActions = { togglePin: layout.togglePin, focusAfterChange: layout.focusAfterChange }

  // The output stays mounted while entries show: screen readers only announce
  // changes to a live region that was already on the page.
  return (
    <div className="flex flex-col">
      <LibraryFilterBar
        filters={filters}
        onChange={setFilters}
        nameFilterRef={layout.focusAfterChange(nameFilterFocusKey)}
      />
      <output className="px-2 text-sm text-muted">
        {isEmpty ? emptyLibraryMessage(matchingEntries.length > 0, hasLibraryFilters(filters)) : ""}
      </output>
      {pinnedEntries.length > 0 && (
        <PinnedLibrarySection entries={pinnedEntries} entryActions={entryActions} />
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
          entryActions={entryActions}
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
