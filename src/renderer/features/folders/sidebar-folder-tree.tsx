import { FolderPlus } from "lucide-react"
import { useId, useState } from "react"
import type { Folder, FolderTree } from "../../../shared/folders"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { useSavedSettingState } from "../../lib/use-saved-setting-state"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { IconButton } from "../../ui/icon-button"
import { TreeView } from "../../ui/tree-view"
import { visibleTreeRows } from "../../ui/visible-tree-rows"
import { DeleteFolderDialog } from "./delete-folder-dialog"
import { useFolderTree } from "./folder-tree"
import { folderTreeNodes } from "./folder-tree-nodes"
import {
  type SidebarFolderActions,
  SidebarFolderRow,
  SpotifyItemRow,
} from "./sidebar-folder-tree-rows"
import { useFolderTreeChanges } from "./use-folder-tree-changes"

// The tree is the one every Add to folder menu shares, so a folder created or
// imported anywhere shows here at once. It shows nothing while it loads, so
// the library does not jump around while it appears.
export function SidebarFolderTree() {
  const folderTree = useFolderTree()
  const savedExpandedFolderIds = useLoad(
    loadSavedSetting("expandedFolders", []),
    "The expanded folders failed to load",
  )

  if (folderTree.state.status === "failed") {
    return (
      <div className="px-2 pb-2">
        <ErrorWithRetry message="Your folders didn't load." onRetry={folderTree.retry} />
      </div>
    )
  }
  if (folderTree.state.status === "loading" || savedExpandedFolderIds.state.status !== "loaded") {
    return null
  }
  return (
    <LoadedFolderTree
      tree={folderTree.state.value}
      savedExpandedFolderIds={savedExpandedFolderIds.state.value}
    />
  )
}

function useExpandedFolders(savedExpandedFolderIds: ReadonlyArray<string>) {
  const [expandedFolderIds, changeExpandedFolderIds] = useSavedSettingState(
    "expandedFolders",
    savedExpandedFolderIds,
  )
  const toggleExpanded = (folderId: string) =>
    changeExpandedFolderIds(
      expandedFolderIds.includes(folderId)
        ? expandedFolderIds.filter((expandedId) => expandedId !== folderId)
        : [...expandedFolderIds, folderId],
    )
  return { expandedKeys: new Set(expandedFolderIds), toggleExpanded }
}

interface LoadedFolderTreeProps {
  readonly tree: FolderTree
  readonly savedExpandedFolderIds: ReadonlyArray<string>
}

function LoadedFolderTree({ tree, savedExpandedFolderIds }: LoadedFolderTreeProps) {
  const { expandedKeys, toggleExpanded } = useExpandedFolders(savedExpandedFolderIds)
  const nodes = folderTreeNodes(tree)
  const rows = visibleTreeRows(nodes, expandedKeys)
  const { rowFocusRef, newFolderButtonRef, ...changes } = useFolderTreeChanges(tree, (folderId) =>
    rows.findIndex((row) => row.node.key === folderId),
  )
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const headingId = useId()

  const actions: SidebarFolderActions = {
    // The new folder must be on screen to be named, so its parent opens.
    createFolderInside: (folder) => {
      if (!expandedKeys.has(folder.id)) toggleExpanded(folder.id)
      changes.createFolder(folder.id)
    },
    startRenaming: changes.startRenaming,
    rename: changes.renameFolder,
    cancelRenaming: changes.cancelRenaming,
    askToDelete: setFolderToDelete,
  }

  return (
    <div className="flex flex-col pb-2">
      <div className="flex items-center justify-between gap-2 pl-2">
        <h3 id={headingId} className="text-sm font-semibold text-muted">
          Folders
        </h3>
        <IconButton
          ref={newFolderButtonRef}
          label="New folder"
          icon={FolderPlus}
          onClick={() => changes.createFolder(null)}
        />
      </div>
      {tree.length === 0 ? null : (
        <TreeView
          labelledBy={headingId}
          nodes={nodes}
          expandedKeys={expandedKeys}
          onToggleExpanded={toggleExpanded}
          rowFocusRef={rowFocusRef}
          renderItem={(entry, itemProps) =>
            entry._tag === "Folder" ? (
              <SidebarFolderRow
                folder={entry}
                isRenaming={entry.id === changes.renamingFolderId}
                itemProps={itemProps}
                actions={actions}
              />
            ) : (
              <SpotifyItemRow item={entry} itemProps={itemProps} />
            )
          }
        />
      )}
      {folderToDelete === null ? null : (
        <DeleteFolderDialog
          folder={folderToDelete}
          onDelete={() => changes.deleteFolder(folderToDelete)}
          onClose={() => setFolderToDelete(null)}
        />
      )}
    </div>
  )
}
