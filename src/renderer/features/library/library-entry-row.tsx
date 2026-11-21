import { Link } from "@tanstack/react-router"
import { Pin, PinOff } from "lucide-react"
import type { KeyboardEvent } from "react"
import { ContextMenu } from "../../ui/context-menu"
import { hasShortcutModifier } from "../../ui/has-shortcut-modifier"
import { useContextMenu } from "../../ui/use-context-menu"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import { useAddToFolder } from "../folders/use-add-to-folder"
import type { LibraryEntry } from "./library-entries"
import { LibraryEntryArtwork } from "./library-entry-artwork"
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
// (docs/design.md); keyboard users pin the focused row with P instead.
export function LibraryEntryRow({ entry, pinned, rovingProps, actions }: LibraryEntryRowProps) {
  const pinLabel = pinned ? `Unpin ${entry.name}` : `Pin ${entry.name} to the top`
  const focusAfterPin = actions.focusAfterChange(entry.uri)
  const entryMenu = useContextMenu()
  const addToFolder = useAddToFolder()
  // Liked Songs is not an item Spotify can link to, so no folder can hold it,
  // and it has no other action for a menu.
  const opensMenu = entry.kind !== "liked-songs"

  const togglePinWithKey = (event: KeyboardEvent) => {
    // Lowercased so the shortcut also works with Caps Lock on.
    if (event.key.toLowerCase() !== "p" || hasShortcutModifier(event)) return
    event.preventDefault()
    actions.togglePin(entry)
  }

  return (
    <div className="group flex items-center rounded-small transition-colors duration-120 ease-out hover:bg-surface-raised">
      <Link
        {...entry.page}
        {...rovingProps}
        ref={(row: HTMLElement | null) => {
          rovingProps.ref(row)
          focusAfterPin(row)
        }}
        onKeyDown={(event) => {
          togglePinWithKey(event)
          if (opensMenu) {
            entryMenu.openWithKeyboard(event)
          }
        }}
        onContextMenu={opensMenu ? entryMenu.openAtPointer : undefined}
        aria-keyshortcuts="P"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-small px-2 py-1"
      >
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
        onClick={() => actions.togglePin(entry)}
        className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity duration-120 ease-out group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground"
      >
        {pinned ? <PinOff aria-hidden size={20} /> : <Pin aria-hidden size={20} />}
      </button>
      {opensMenu && entryMenu.anchor !== null ? (
        <ContextMenu
          label={`Actions for ${entry.name}`}
          items={[addToFolder(entry)]}
          anchor={entryMenu.anchor}
          onClose={entryMenu.close}
        />
      ) : null}
    </div>
  )
}
