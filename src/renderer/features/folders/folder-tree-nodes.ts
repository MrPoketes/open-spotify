import type { Folder, FolderEntry, FolderTree } from "../../../shared/folders"
import type { TreeNode } from "../../ui/visible-tree-rows"

function folderNode(folder: Folder): TreeNode<FolderEntry> {
  return {
    key: folder.id,
    value: folder,
    children: folder.entries.map((entry) => entryNode(entry, folder)),
  }
}

// The same Spotify item can sit in several folders, so its key includes the
// folder it is in.
const entryNode = (entry: FolderEntry, parent: Folder): TreeNode<FolderEntry> =>
  entry._tag === "Folder"
    ? folderNode(entry)
    : { key: `${parent.id}/${entry.uri}`, value: entry, children: null }

export const folderTreeNodes = (tree: FolderTree) => tree.map(folderNode)
