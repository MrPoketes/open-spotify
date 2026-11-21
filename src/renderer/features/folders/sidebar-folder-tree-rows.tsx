import { Link } from "@tanstack/react-router"
import type { KeyboardEvent } from "react"
import type { Folder, SpotifyItem } from "../../../shared/folders"
import { Artwork } from "../../ui/artwork"
import { ArtworkSummary } from "../../ui/artwork-summary"
import { hasShortcutModifier } from "../../ui/has-shortcut-modifier"
import type { TreeItemProps } from "../../ui/tree-view"
import { useContextMenu } from "../../ui/use-context-menu"
import { describeFolderEntry } from "./folder-entry-description"
import { FolderRenameField, type RenameEnd } from "./folder-rename-field"

const rowClassName = "flex min-w-0 flex-1 rounded-small py-1 pr-2"

export interface SidebarFolderActions {
  readonly createFolderInside: (folder: Folder) => void
  readonly startRenaming: (folder: Folder) => void
  readonly rename: (folder: Folder, name: string, end: RenameEnd) => void
  readonly cancelRenaming: (folder: Folder, end: RenameEnd) => void
  readonly askToDelete: (folder: Folder) => void
}

interface SidebarFolderRowProps {
  readonly folder: Folder
  readonly isRenaming: boolean
  readonly itemProps: TreeItemProps
  readonly actions: SidebarFolderActions
}

export function SidebarFolderRow({
  folder,
  isRenaming,
  itemProps,
  actions,
}: SidebarFolderRowProps) {
  const { name, details, icon, page } = describeFolderEntry(folder)
  const folderMenu = useContextMenu({
    label: `Actions for ${name}`,
    items: [
      { label: "New folder", onSelect: () => actions.createFolderInside(folder) },
      { label: "Rename", onSelect: () => actions.startRenaming(folder) },
      { label: "Delete…", onSelect: () => actions.askToDelete(folder) },
    ],
  })

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
          onRename={(newName, end) => actions.rename(folder, newName, end)}
          onCancel={(end) => actions.cancelRenaming(folder, end)}
        />
      </div>
    )
  }

  const startRenamingWithKey = (event: KeyboardEvent) => {
    if (event.key !== "F2" || hasShortcutModifier(event)) return
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
          folderMenu.openWithKeyboard(event)
        }}
        onContextMenu={folderMenu.openAtPointer}
        aria-keyshortcuts="F2"
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
  readonly item: SpotifyItem
  readonly itemProps: TreeItemProps
}

export function SpotifyItemRow({ item, itemProps }: SpotifyItemRowProps) {
  const { name, details, artwork, icon, isArtist, page } = describeFolderEntry(item)
  return (
    <Link {...page} {...itemProps} className={rowClassName}>
      <ArtworkSummary
        artwork={{ sources: artwork, placeholderIcon: icon, round: isArtist }}
        title={name}
        details={details}
      />
    </Link>
  )
}
