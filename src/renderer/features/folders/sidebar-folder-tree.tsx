import { Folder as FolderIcon, FolderPlus } from "lucide-react"
import { use, useId, useState } from "react"
import type { Folder, FolderTree } from "../../../shared/folders"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { useSavedSettingState } from "../../lib/use-saved-setting-state"
import { ArtworkSummary } from "../../ui/artwork-summary"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { IconButton } from "../../ui/icon-button"
import { sidebarHeadingClassNames } from "../../ui/sidebar-heading-class-names"
import { TreeView } from "../../ui/tree-view"
import { visibleTreeRows } from "../../ui/visible-tree-rows"
import { RailFailure } from "../shell/rail-failure"
import { SidebarRailContext } from "../shell/sidebar-rail-context"
import { DeleteFolderDialog } from "./delete-folder-dialog"
import { useFolderTree } from "./folder-tree"
import { folderTreeNodes } from "./folder-tree-nodes"
import { SidebarFolderRail } from "./sidebar-folder-rail"
import {
  SidebarFolderRow,
  SpotifyItemRow,
  type SidebarFolderActions,
} from "./sidebar-folder-tree-rows"
import { useDropFolderEntry } from "./use-drop-folder-entry"
import { useFolderTreeChanges } from "./use-folder-tree-changes"

// The tree is the one every Add to folder menu shares, so a folder created or
// imported anywhere shows here at once. It shows nothing while it loads: the
// tree comes from local storage almost at once, so a loading message would
// only flash.
export function SidebarFolderTree() {
  const folderTree = useFolderTree()
  const savedExpandedFolderIds = useLoad(
    loadSavedSetting("expandedFolders", []),
    "The expanded folders failed to load",
  )
  const rail = use(SidebarRailContext)

  if (folderTree.state.status === "failed") {
    if (rail !== null) return <RailFailure message="Your folders didn't load." rail={rail} />
    return (
      <div className="px-2 pb-2">
        <ErrorWithRetry message="Your folders didn't load." onRetry={folderTree.retry} />
      </div>
    )
  }
  if (folderTree.state.status === "loading" || savedExpandedFolderIds.state.status !== "loaded") {
    return null
  }
  if (rail !== null) {
    return <SidebarFolderRail tree={folderTree.state.value} />
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

// Without it the heading and its New folder button would sit over nothing, and
// a new user would not learn what folders are for.
function NoFolders() {
  return (
    <div className="px-2 py-1">
      <ArtworkSummary
        artwork={{
          sources: [],
          placeholderIcon: FolderIcon,
          placeholderColors: "border border-dashed border-border text-muted",
          round: false,
        }}
        title={<span className="text-muted">No folders yet</span>}
        details="Group anything you've saved"
      />
    </div>
  )
}

interface LoadedFolderTreeProps {
  readonly tree: FolderTree
  readonly savedExpandedFolderIds: ReadonlyArray<string>
}

function LoadedFolderTree({ tree, savedExpandedFolderIds }: LoadedFolderTreeProps) {
  const { expandedKeys, toggleExpanded } = useExpandedFolders(savedExpandedFolderIds)
  const nodes = folderTreeNodes(tree)
  const rows = visibleTreeRows(nodes, expandedKeys)
  const {
    rowFocusRef,
    newFolderButtonRef,
    renamingFolderId,
    createFolder,
    deleteFolder,
    ...renaming
  } = useFolderTreeChanges(tree, (folderId) => rows.findIndex((row) => row.node.key === folderId))
  const dropRules = useDropFolderEntry()
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const headingId = useId()

  const actions: SidebarFolderActions = {
    ...renaming,
    // The new folder must be on screen to be named, so its parent opens.
    createFolderInside: (folder) => {
      if (!expandedKeys.has(folder.id)) toggleExpanded(folder.id)
      createFolder(folder.id)
    },
    askToDelete: setFolderToDelete,
  }

  return (
    <div className="flex flex-col pb-2">
      <div className={sidebarHeadingClassNames.row}>
        <h3 id={headingId} className={sidebarHeadingClassNames.label}>
          Folders
        </h3>
        <IconButton
          ref={newFolderButtonRef}
          label="New folder"
          icon={FolderPlus}
          onClick={() => createFolder(null)}
        />
      </div>
      {tree.length === 0 ? (
        <NoFolders />
      ) : (
        <TreeView
          labelledBy={headingId}
          nodes={nodes}
          expandedKeys={expandedKeys}
          onToggleExpanded={toggleExpanded}
          rowFocusRef={rowFocusRef}
          {...dropRules}
          renderItem={(placed, itemProps) =>
            placed._tag === "PlacedFolder" ? (
              <SidebarFolderRow
                placed={placed}
                tree={tree}
                isRenaming={placed.entry.id === renamingFolderId}
                itemProps={itemProps}
                actions={actions}
              />
            ) : (
              <SpotifyItemRow placed={placed} tree={tree} itemProps={itemProps} />
            )
          }
        />
      )}
      {folderToDelete === null ? null : (
        <DeleteFolderDialog
          folder={folderToDelete}
          onDelete={() => deleteFolder(folderToDelete)}
          onClose={() => setFolderToDelete(null)}
        />
      )}
    </div>
  )
}
