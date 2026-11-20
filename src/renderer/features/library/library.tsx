import { Link, Navigate } from "@tanstack/react-router"
import { useState } from "react"
import { useLoad } from "../../lib/use-load"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { type RovingRowProps, useRovingFocus } from "../../ui/use-roving-focus"
import { type LibraryEntry, loadLibraryEntries } from "./library-entries"
import { LibraryEntryArtwork } from "./library-entry-artwork"
import { LibraryFilterBar } from "./library-filter-bar"
import { filterLibraryEntries, noLibraryFilters } from "./library-filters"

export function Library() {
  const { state, retry } = useLoad(loadLibraryEntries, "The library failed to load")

  if (state.status === "loading") {
    return <output className="px-2 text-sm text-muted">Loading your library…</output>
  }

  // Retry cannot bring back a session, so these go straight to login.
  if (state.status === "failed" && state.error._tag === "NotLoggedIn") {
    return <Navigate to="/login" />
  }

  if (state.status === "failed" && state.error._tag === "SessionExpired") {
    return <Navigate to="/login" search={{ sessionExpired: true }} />
  }

  if (state.status === "failed") {
    return (
      <div className="px-2">
        <ErrorWithRetry message="Your library didn't load." onRetry={retry} />
      </div>
    )
  }

  if (state.value.length === 0) {
    return (
      <p className="px-2 text-sm text-muted">
        Playlists, albums, artists, and shows you save will appear here.
      </p>
    )
  }

  return <FilterableLibrary entries={state.value} />
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
  const { onKeyDown, rowProps } = useRovingFocus(entries.length)
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused entry, and the list moves focus between its entries: the roving focus docs/design.md requires for lists
    <ul onKeyDown={onKeyDown} className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.uri}>
          <LibraryEntryRow entry={entry} rovingProps={rowProps(index)} />
        </li>
      ))}
    </ul>
  )
}

const entryRowClassName = "flex items-center gap-3 rounded-small px-2 py-1"

interface LibraryEntryRowProps {
  readonly entry: LibraryEntry
  readonly rovingProps: RovingRowProps
}

function LibraryEntryRow({ entry, rovingProps }: LibraryEntryRowProps) {
  const content = (
    <>
      <LibraryEntryArtwork kind={entry.kind} images={entry.images} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm">{entry.name}</span>
        <span className="truncate text-xs text-muted">{entry.details}</span>
      </div>
    </>
  )
  if (entry.page === null) {
    return (
      <div {...rovingProps} className={entryRowClassName}>
        {content}
      </div>
    )
  }
  return (
    <Link
      {...entry.page}
      {...rovingProps}
      className={`${entryRowClassName} transition-colors duration-120 ease-out hover:bg-surface-raised`}
    >
      {content}
    </Link>
  )
}
