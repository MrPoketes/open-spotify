import { Navigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use, useState } from "react"
import { defaultLibrarySections } from "../../../shared/library-layout"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { loginDestinationFor } from "../login/login-destination"
import { RailFailure } from "../shell/rail-failure"
import { SidebarRailContext } from "../shell/sidebar-rail-context"
import type { SpotifyApiError } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { arrangeLibrary } from "./arrange-library"
import { HiddenLibrarySections } from "./hidden-library-sections"
import { loadLibraryEntries, type LibraryEntry } from "./library-entries"
import { LibraryFilterBar } from "./library-filter-bar"
import { filterLibraryEntries, hasLibraryFilters, noLibraryFilters } from "./library-filters"
import { LibraryLoading } from "./library-loading"
import { useLibraryPlaylists, type LibraryPlaylistsLoad } from "./library-playlists"
import { LibraryRail } from "./library-rail"
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
  const isRail = use(SidebarRailContext) !== null

  if (state.status === "loading") {
    return <LibraryLoading />
  }

  if (state.status === "failed") {
    return <LibraryFailure error={state.error} onRetry={retry} />
  }

  // The rail has no room for the explanation, and nothing to show.
  if (state.value.entries.length === 0) {
    if (isRail) return null
    return (
      <p className="px-2 text-sm text-muted">
        Playlists, albums, artists, and shows you save will appear here.
      </p>
    )
  }

  const { entries, ...savedLayout } = state.value
  return <ArrangedLibraryView entries={entries} savedLayout={savedLayout} />
}

interface LibraryFailureProps {
  readonly error: SpotifyApiError
  readonly onRetry: () => void
}

// In the icon rail an expired session still goes to login, as
// SpotifyLoadFailure sends it in the full sidebar.
function LibraryFailure({ error, onRetry }: LibraryFailureProps) {
  const rail = use(SidebarRailContext)
  const message = "Your library didn't load."
  if (rail === null) {
    return (
      <div className="px-2">
        <SpotifyLoadFailure error={error} message={message} onRetry={onRetry} />
      </div>
    )
  }
  const destination = loginDestinationFor(error)
  if (destination !== null) {
    return <Navigate {...destination} />
  }
  return <RailFailure message={message} rail={rail} />
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
  const isRail = use(SidebarRailContext) !== null
  const entryActions = { togglePin: layout.togglePin, focusAfterChange: layout.focusAfterChange }
  // The rail has no filters to show, so it leaves them out.
  if (isRail) {
    return (
      <LibraryRail
        {...arrangeLibrary(entries, layout.pinnedUris, layout.sections)}
        entryActions={entryActions}
      />
    )
  }
  const matchingEntries = filterLibraryEntries(entries, filters)
  const { pinnedEntries, shownSections } = arrangeLibrary(
    matchingEntries,
    layout.pinnedUris,
    layout.sections,
  )
  const isEmpty = pinnedEntries.length === 0 && shownSections.length === 0

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
