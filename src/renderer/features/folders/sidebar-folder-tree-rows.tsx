import { Link } from "@tanstack/react-router"
import type { KeyboardEvent } from "react"
import type { Folder, FolderTree } from "../../../shared/folders"
import { Artwork } from "../../ui/artwork"
import { ArtworkSummary } from "../../ui/artwork-summary"
import type { TreeItemProps } from "../../ui/tree-view"
import { useContextMenu } from "../../ui/use-context-menu"
import { useRowShortcut } from "../shortcuts/use-row-shortcut"
import { describeFolderEntry } from "./folder-entry-description"
import { type FocusAfterRename, FolderRenameField } from "./folder-rename-field"
import type { PlacedFolder, PlacedItem } from "./folder-tree-nodes"
import { useMoveFolderEntry } from "./use-move-folder-entry"

const rowClassName = "flex min-w-0 flex-1 rounded-small py-1 pr-2"

export interface SidebarFolderActions {
  readonly createFolderInside: (folder: Folder) => void
  readonly startRenaming: (folder: Folder) => void
  readonly rename: (folder: Folder, name: string, focusAfter: FocusAfterRename) => void
  readonly cancelRenaming: (folder: Folder, focusAfter: FocusAfterRename) => void
  readonly askToDelete: (folder: Folder) => void
}

interface SidebarFolderRowProps {
  readonly placed: PlacedFolder
  readonly tree: FolderTree
  readonly isRenaming: boolean
  readonly itemProps: TreeItemProps
  readonly actions: SidebarFolderActions
}

export function SidebarFolderRow({
  placed,
  tree,
  isRenaming,
  itemProps,
  actions,
}: SidebarFolderRowProps) {
  const folder = placed.entry
  const { name, details, icon, page } = describeFolderEntry(folder)
  const { moveWithKey, ariaKeyShortcuts, moveToFolderItem } = useMoveFolderEntry(placed, tree)
  const folderMenu = useContextMenu({
    label: `Actions for ${name}`,
    items: [
      { label: "New folder", onSelect: () => actions.createFolderInside(folder) },
      { label: "Rename", onSelect: () => actions.startRenaming(folder) },
      ...(moveToFolderItem === undefined ? [] : [moveToFolderItem]),
      { label: "Delete…", onSelect: () => actions.askToDelete(folder) },
    ],
  })
  const renameShortcut = useRowShortcut("renameFolder")

  // While the name is edited, the field is the row's tab stop. Shift+Tab
  // from it must leave the row, which the end of the rename replaces.
  if (isRenaming) {
    return (
      <div
        {...itemProps}
        tabIndex={-1}
        aria-label={name}
        className={`${rowClassName} items-center gap-3`}
      >
        <Artwork sources={[]} placeholderIcon={icon} size={40} className="rounded-small" />
        <FolderRenameField
          folderName={name}
          onRename={(newName, focusAfter) => actions.rename(folder, newName, focusAfter)}
          onCancel={(focusAfter) => actions.cancelRenaming(folder, focusAfter)}
        />
      </div>
    )
  }

  const startRenamingWithKey = (event: KeyboardEvent) => {
    if (!renameShortcut.isPressed(event)) return
    event.preventDefault()
    actions.startRenaming(folder)
  }

  return (
    <>
      <Link
        {...page}
        {...itemProps}
        onKeyDown={(event) => {
          itemProps.onKeyDown(event)
          startRenamingWithKey(event)
          moveWithKey(event)
          folderMenu.openWithKeyboard(event)
        }}
        onContextMenu={folderMenu.openAtPointer}
        aria-keyshortcuts={`${renameShortcut.ariaKeyShortcuts} ${ariaKeyShortcuts}`}
        className={rowClassName}
      >
        <ArtworkSummary
          artwork={{ sources: [], placeholderIcon: icon, round: false }}
          title={name}
          details={details}
        />
      </Link>
      {folderMenu.menu}
    </>
  )
}

interface SpotifyItemRowProps {
  readonly placed: PlacedItem
  readonly tree: FolderTree
  readonly itemProps: TreeItemProps
}

export function SpotifyItemRow({ placed, tree, itemProps }: SpotifyItemRowProps) {
  const { name, details, artwork, icon, isArtist, page } = describeFolderEntry(placed.entry)
  const { moveWithKey, ariaKeyShortcuts, moveToFolderItem } = useMoveFolderEntry(placed, tree)
  const itemMenu = useContextMenu({
    label: `Actions for ${name}`,
    items: moveToFolderItem === undefined ? [] : [moveToFolderItem],
  })
  return (
    <>
      <Link
        {...page}
        {...itemProps}
        onKeyDown={(event) => {
          itemProps.onKeyDown(event)
          moveWithKey(event)
          itemMenu.openWithKeyboard(event)
        }}
        onContextMenu={itemMenu.openAtPointer}
        aria-keyshortcuts={ariaKeyShortcuts}
        className={rowClassName}
      >
        <ArtworkSummary
          artwork={{ sources: artwork, placeholderIcon: icon, round: isArtist }}
          title={name}
          details={details}
        />
      </Link>
      {itemMenu.menu}
    </>
  )
}
