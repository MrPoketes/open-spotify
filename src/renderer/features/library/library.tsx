import { useState } from "react"
import type { LibraryEntry } from "./library-entries"
import { LibraryEntryArtwork } from "./library-entry-artwork"
import { LibraryFilterBar } from "./library-filter-bar"
import { filterLibraryEntries, noLibraryFilters } from "./library-filters"
import { useLibraryEntries } from "./use-library-entries"

// A new key mounts a fresh LibraryContent, which loads the library again.
export function Library() {
  const [attempt, setAttempt] = useState(0)
  return (
    <LibraryContent
      key={attempt}
      onRetry={() => setAttempt((previousAttempt) => previousAttempt + 1)}
    />
  )
}

function LibraryContent({ onRetry }: { readonly onRetry: () => void }) {
  const state = useLibraryEntries()

  if (state.status === "loading") {
    return <output className="px-2 text-sm text-muted">Loading your library…</output>
  }

  if (state.status === "failed") {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 px-2 text-sm">
        <p>Your library didn't load.</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75"
        >
          Retry
        </button>
      </div>
    )
  }

  if (state.entries.length === 0) {
    return (
      <p className="px-2 text-sm text-muted">
        Playlists, albums, artists, and shows you save will appear here.
      </p>
    )
  }

  return <FilterableLibrary entries={state.entries} />
}

function FilterableLibrary({ entries }: { readonly entries: ReadonlyArray<LibraryEntry> }) {
  const [filters, setFilters] = useState(noLibraryFilters)
  const matchingEntries = filterLibraryEntries(entries, filters)
  const hasMatches = matchingEntries.length > 0

  // The output stays mounted while entries match: screen readers only announce
  // changes to a live region that was already on the page.
  return (
    <div className="flex flex-col">
      <LibraryFilterBar filters={filters} onChange={setFilters} />
      <output className="px-2 text-sm text-muted">
        {hasMatches ? "" : "Nothing in your library matches these filters."}
      </output>
      {hasMatches && <LibraryEntryList entries={matchingEntries} />}
    </div>
  )
}

function LibraryEntryList({ entries }: { readonly entries: ReadonlyArray<LibraryEntry> }) {
  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li key={entry.uri} className="flex items-center gap-3 px-2 py-1">
          <LibraryEntryArtwork kind={entry.kind} images={entry.images} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm">{entry.name}</span>
            <span className="truncate text-xs text-muted">{entry.details}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
