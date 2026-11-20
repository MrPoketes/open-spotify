import { useState } from "react"
import { LibraryEntryArtwork } from "./library-entry-artwork"
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
          className="rounded-small bg-surface-raised px-3 py-2 text-sm"
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

  return (
    <ul className="flex flex-col">
      {state.entries.map((entry) => (
        <li key={entry.uri} className="flex items-center gap-3 rounded-small px-2 py-1">
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
