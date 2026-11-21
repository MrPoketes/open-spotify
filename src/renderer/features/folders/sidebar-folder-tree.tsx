import { Link } from "@tanstack/react-router"
import { useId } from "react"
import type { FolderEntry, FolderTree } from "../../../shared/folders"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { useSavedSettingState } from "../../lib/use-saved-setting-state"
import { ArtworkSummary } from "../../ui/artwork-summary"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { type TreeItemProps, TreeView } from "../../ui/tree-view"
import { describeFolderEntry } from "./folder-entry-description"
import { useFolderTree } from "./folder-tree"
import { folderTreeNodes } from "./folder-tree-nodes"

// The tree is the one every Add to folder menu shares, so a folder created or
// imported anywhere shows here at once. It shows nothing while it loads or
// when there are no folders, so a user who has never made a folder sees the
// library straight away.
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
  if (folderTree.state.value.length === 0) return null
  return (
    <LoadedFolderTree
      tree={folderTree.state.value}
      expandedFolderIds={savedExpandedFolderIds.state.value}
    />
  )
}

interface LoadedFolderTreeProps {
  readonly tree: FolderTree
  readonly expandedFolderIds: ReadonlyArray<string>
}

function LoadedFolderTree({
  tree,
  expandedFolderIds: savedExpandedFolderIds,
}: LoadedFolderTreeProps) {
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

  const headingId = useId()

  return (
    <div className="flex flex-col pb-2">
      <h3 id={headingId} className="py-1 pl-2 text-sm font-semibold text-muted">
        Folders
      </h3>
      <TreeView
        labelledBy={headingId}
        nodes={folderTreeNodes(tree)}
        expandedKeys={new Set(expandedFolderIds)}
        onToggleExpanded={toggleExpanded}
        renderItem={(entry, itemProps) => <FolderTreeItem entry={entry} itemProps={itemProps} />}
      />
    </div>
  )
}

interface FolderTreeItemProps {
  readonly entry: FolderEntry
  readonly itemProps: TreeItemProps
}

function FolderTreeItem({ entry, itemProps }: FolderTreeItemProps) {
  const { name, details, artwork, icon, isArtist, page } = describeFolderEntry(entry)
  return (
    <Link {...page} {...itemProps} className="flex min-w-0 flex-1 rounded-small py-1 pr-2">
      <ArtworkSummary
        artwork={{ sources: artwork, placeholderIcon: icon, round: isArtist }}
        title={name}
        details={details}
      />
    </Link>
  )
}
