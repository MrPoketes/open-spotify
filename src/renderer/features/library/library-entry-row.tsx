import { useDraggable } from "@dnd-kit/core"
import { Link } from "@tanstack/react-router"
import { Pin, PinOff } from "lucide-react"
import { use, type KeyboardEvent } from "react"
import { ArtworkSummary, SummaryArtworkTile } from "../../ui/artwork-summary"
import { ContextMenu } from "../../ui/context-menu"
import { rowActionClassName } from "../../ui/row-action-class-name"
import { sidebarRowClassNames } from "../../ui/sidebar-row-class-names"
import { Tooltip } from "../../ui/tooltip"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import { toSpotifyItem, useAddToFolder } from "../folders/use-add-to-folder"
import { SidebarRailContext } from "../shell/sidebar-rail-context"
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

// In the sidebar's icon rail the row shows only its artwork, and its name in
// a tooltip and its accessible name; the pin shortcut still works there.
export function LibraryEntryRow({ entry, pinned, rovingProps, actions }: LibraryEntryRowProps) {
  const isRail = use(SidebarRailContext) !== null
  const focusAfterPin = actions.focusAfterChange(entry.uri)
  const addToFolder = useAddToFolder()
  const pinShortcut = useRowShortcut("togglePin")
  // Liked Songs is not an item Spotify can link to, so no folder can hold it,
  // and it has no other action for a menu.
  const canGoInFolder = entry.kind !== "liked-songs"
  const entryMenu = canGoInFolder
    ? { label: `Actions for ${entry.name}`, items: [addToFolder(entry)] }
    : null
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
      className={`group flex items-center ${sidebarRowClassNames.surface} ${isDragging ? "opacity-50" : ""}`}
    >
      <ContextMenu menu={entryMenu}>
        <Tooltip label={entry.name} details={entry.details} disabled={!isRail}>
          <Link
            {...entry.page}
            {...rovingProps}
            ref={(row: HTMLElement | null) => {
              rovingProps.ref(row)
              focusAfterPin(row)
            }}
            onKeyDown={togglePinWithKey}
            aria-keyshortcuts={pinShortcut.ariaKeyShortcuts}
            aria-label={isRail ? `${entry.name}, ${entry.details}` : undefined}
            className={sidebarRowClassNames.link}
          >
            {isRail ? (
              <SummaryArtworkTile artwork={libraryEntryArtwork(entry)} />
            ) : (
              <ArtworkSummary
                artwork={libraryEntryArtwork(entry)}
                title={entry.name}
                details={entry.details}
              />
            )}
          </Link>
        </Tooltip>
      </ContextMenu>
      {isRail ? null : (
        <PinButton
          entry={entry}
          pinned={pinned}
          shortcutLabel={pinShortcut.label}
          onToggle={() => actions.togglePin(entry)}
        />
      )}
    </div>
  )
}

interface PinButtonProps {
  readonly entry: LibraryEntry
  readonly pinned: boolean
  readonly shortcutLabel: string
  readonly onToggle: () => void
}

// The pin button stays out of the tab order, so a list remains one tab stop
// (docs/design.md); keyboard users pin the focused row with a shortcut instead.
function PinButton({ entry, pinned, shortcutLabel, onToggle }: PinButtonProps) {
  const pinLabel = pinned ? `Unpin ${entry.name}` : `Pin ${entry.name} to the top`
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={pinLabel}
      title={`${pinLabel} (${shortcutLabel})`}
      onClick={onToggle}
      className={`mr-2 ${rowActionClassName}`}
    >
      {pinned ? <PinOff aria-hidden size={20} /> : <Pin aria-hidden size={20} />}
    </button>
  )
}
