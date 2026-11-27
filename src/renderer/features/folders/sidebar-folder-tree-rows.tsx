import { Link } from "@tanstack/react-router"
import { FolderOpen } from "lucide-react"
import type { KeyboardEvent } from "react"
import type { Folder, FolderTree } from "../../../shared/folders"
import { Artwork } from "../../ui/artwork"
import { ArtworkSummary } from "../../ui/artwork-summary"
import { ContextMenu } from "../../ui/context-menu"
import { sidebarRowClassNames } from "../../ui/sidebar-row-class-names"
import type { TreeItemProps } from "../../ui/tree-view"
import { useRowShortcut } from "../shortcuts/use-row-shortcut"
import { describeFolderEntry } from "./folder-entry-description"
import { FolderRenameField, type FocusAfterRename } from "./folder-rename-field"
import type { PlacedFolder, PlacedItem } from "./folder-tree-nodes"
import { useMoveFolderEntry } from "./use-move-folder-entry"

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
  const { name, details, icon: closedIcon, page } = describeFolderEntry(folder)
  // The chevron sits at the far end of the row, so the tile shows an open
  // folder too.
  const icon = itemProps["aria-expanded"] === true ? FolderOpen : closedIcon
  const { moveWithKey, ariaKeyShortcuts, moveToFolderItem } = useMoveFolderEntry(placed, tree)
  const folderMenu = {
    label: `Actions for ${name}`,
    items: [
      { label: "New folder", onSelect: () => actions.createFolderInside(folder) },
      { label: "Rename", onSelect: () => actions.startRenaming(folder) },
      ...(moveToFolderItem === undefined ? [] : [moveToFolderItem]),
      { label: "Delete…", onSelect: () => actions.askToDelete(folder) },
    ],
  }
  const renameShortcut = useRowShortcut("renameFolder")

  // While the name is edited, the field is the row's tab stop. Shift+Tab
  // from it must leave the row, which the end of the rename replaces.
  if (isRenaming) {
    return (
      <div
        {...itemProps}
        tabIndex={-1}
        aria-label={name}
        className={`${sidebarRowClassNames.link} items-center gap-3`}
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
    <ContextMenu menu={folderMenu}>
      <Link
        {...page}
        {...itemProps}
        onKeyDown={(event) => {
          itemProps.onKeyDown(event)
          startRenamingWithKey(event)
          moveWithKey(event)
        }}
        aria-keyshortcuts={`${renameShortcut.ariaKeyShortcuts} ${ariaKeyShortcuts}`}
        className={sidebarRowClassNames.link}
      >
        <ArtworkSummary
          artwork={{ sources: [], placeholderIcon: icon, round: false }}
          title={name}
          details={details}
        />
      </Link>
    </ContextMenu>
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
  const itemMenu = {
    label: `Actions for ${name}`,
    items: moveToFolderItem === undefined ? [] : [moveToFolderItem],
  }
  return (
    <ContextMenu menu={itemMenu}>
      <Link
        {...page}
        {...itemProps}
        onKeyDown={(event) => {
          itemProps.onKeyDown(event)
          moveWithKey(event)
        }}
        aria-keyshortcuts={ariaKeyShortcuts}
        className={sidebarRowClassNames.link}
      >
        <ArtworkSummary
          artwork={{ sources: artwork, placeholderIcon: icon, round: isArtist }}
          title={name}
          details={details}
        />
      </Link>
    </ContextMenu>
  )
}
