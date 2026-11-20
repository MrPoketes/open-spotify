import { Link } from "@tanstack/react-router"
import { Pin, PinOff } from "lucide-react"
import type { KeyboardEvent } from "react"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import type { LibraryEntry } from "./library-entries"
import { LibraryEntryArtwork } from "./library-entry-artwork"

export interface LibraryEntryActions {
  readonly togglePin: (uri: string) => void
  readonly focusAfterChange: (focusKey: string) => (element: HTMLElement | null) => void
}

interface LibraryEntryRowProps {
  readonly entry: LibraryEntry
  readonly pinned: boolean
  readonly rovingProps: RovingRowProps
  readonly actions: LibraryEntryActions
}

const entryRowClassName = "flex min-w-0 flex-1 items-center gap-3 rounded-small px-2 py-1"

// The pin button stays out of the tab order, so a list remains one tab stop
// (docs/design.md); keyboard users pin the focused row with P instead.
export function LibraryEntryRow({ entry, pinned, rovingProps, actions }: LibraryEntryRowProps) {
  const pinLabel = pinned ? `Unpin ${entry.name}` : `Pin ${entry.name} to the top`
  const focusAfterPin = actions.focusAfterChange(entry.uri)

  const togglePinWithKey = (event: KeyboardEvent) => {
    if (event.key !== "p" || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    actions.togglePin(entry.uri)
  }

  const rowProps = {
    ...rovingProps,
    ref: (row: HTMLElement | null) => {
      rovingProps.ref(row)
      focusAfterPin(row)
    },
    onKeyDown: togglePinWithKey,
    "aria-keyshortcuts": "P",
  }

  return (
    <div className="group flex items-center rounded-small transition-colors duration-120 ease-out hover:bg-surface-raised">
      <Link {...entry.page} {...rowProps} className={entryRowClassName}>
        <LibraryEntryArtwork kind={entry.kind} images={entry.images} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm">{entry.name}</span>
          <span className="truncate text-xs text-muted">{entry.details}</span>
        </div>
      </Link>
      <button
        type="button"
        tabIndex={-1}
        aria-label={pinLabel}
        title={`${pinLabel} (P)`}
        onClick={() => actions.togglePin(entry.uri)}
        className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity duration-120 ease-out group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground"
      >
        {pinned ? <PinOff aria-hidden size={20} /> : <Pin aria-hidden size={20} />}
      </button>
    </div>
  )
}
