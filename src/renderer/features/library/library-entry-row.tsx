import { useDraggable } from "@dnd-kit/core"
import { Link } from "@tanstack/react-router"
import { Pin, PinOff } from "lucide-react"
import type { KeyboardEvent } from "react"
import { ArtworkSummary } from "../../ui/artwork-summary"
import { useContextMenu } from "../../ui/use-context-menu"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import { toSpotifyItem, useAddToFolder } from "../folders/use-add-to-folder"
import { useRowShortcut } from "../shortcuts/use-row-shortcut"
import type { LibraryEntry } from "./library-entries"
import { libraryEntryArtwork } from "./library-entry-artwork"
import type { FocusAfterChange } from "./use-focus-after-change"

export interface LibraryEntryActions {
  readonly togglePin: (entry: LibraryEntry) => void
  readonly focusAfterChange: FocusAfterChange
}

interface LibraryEntryRowProps {
  readonly entry: LibraryEntry
  readonly pinned: boolean
  readonly rovingProps: RovingRowProps
  readonly actions: LibraryEntryActions
}

// The pin button stays out of the tab order, so a list remains one tab stop
// (docs/design.md); keyboard users pin the focused row with a shortcut instead.
export function LibraryEntryRow({ entry, pinned, rovingProps, actions }: LibraryEntryRowProps) {
  const pinLabel = pinned ? `Unpin ${entry.name}` : `Pin ${entry.name} to the top`
  const focusAfterPin = actions.focusAfterChange(entry.uri)
  const addToFolder = useAddToFolder()
  const pinShortcut = useRowShortcut("togglePin")
  // Liked Songs is not an item Spotify can link to, so no folder can hold it,
  // and it has no other action for a menu.
  const canGoInFolder = entry.kind !== "liked-songs"
  const entryMenu = useContextMenu(
    canGoInFolder ? { label: `Actions for ${entry.name}`, items: [addToFolder(entry)] } : null,
  )
  // The folder tree decodes the item from the drag data when the row is
  // dropped on a folder.
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: entry.uri,
    data: toSpotifyItem(entry),
    disabled: !canGoInFolder,
  })

  const togglePinWithKey = (event: KeyboardEvent) => {
    if (!pinShortcut.isPressed(event)) return
    event.preventDefault()
    actions.togglePin(entry)
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={`group flex items-center rounded-small transition-colors duration-120 ease-out hover:bg-surface-raised ${isDragging ? "opacity-50" : ""}`}
    >
      <Link
        {...entry.page}
        {...rovingProps}
        ref={(row: HTMLElement | null) => {
          rovingProps.ref(row)
          focusAfterPin(row)
        }}
        onKeyDown={(event) => {
          togglePinWithKey(event)
          entryMenu.openWithKeyboard(event)
        }}
        onContextMenu={entryMenu.openAtPointer}
        aria-keyshortcuts={pinShortcut.ariaKeyShortcuts}
        className="flex min-w-0 flex-1 rounded-small px-2 py-1"
      >
        <ArtworkSummary
          artwork={libraryEntryArtwork(entry)}
          title={entry.name}
          details={entry.details}
        />
      </Link>
      <button
        type="button"
        tabIndex={-1}
        aria-label={pinLabel}
        title={`${pinLabel} (${pinShortcut.label})`}
        onClick={() => actions.togglePin(entry)}
        className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity duration-120 ease-out group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground"
      >
        {pinned ? <PinOff aria-hidden size={20} /> : <Pin aria-hidden size={20} />}
      </button>
      {entryMenu.menu}
    </div>
  )
}
