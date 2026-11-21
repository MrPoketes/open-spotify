import type { Folder, FolderEntry, FolderTree, SpotifyItem } from "../../../shared/folders"
import type { TreeNode } from "../../ui/visible-tree-rows"

// An entry's index among its parent's entries.
interface Placement {
  readonly position: number
  readonly siblingCount: number
}

// Where an entry sits: its parent folder, or null at the top level. Spotify
// items live only inside folders.
export interface PlacedFolder extends Placement {
  readonly _tag: "PlacedFolder"
  readonly entry: Folder
  readonly parent: Folder | null
}

export interface PlacedItem extends Placement {
  readonly _tag: "PlacedItem"
  readonly entry: SpotifyItem
  readonly parent: Folder
}

export type PlacedEntry = PlacedFolder | PlacedItem

const folderNode = (placed: PlacedFolder): TreeNode<PlacedEntry> => ({
  key: placed.entry.id,
  value: placed,
  children: placed.entry.entries.map((entry, position) =>
    entryNode(entry, { parent: placed.entry, position }),
  ),
})

const entryNode = (
  entry: FolderEntry,
  { parent, position }: { readonly parent: Folder; readonly position: number },
): TreeNode<PlacedEntry> => {
  const placement = { position, siblingCount: parent.entries.length }
  if (entry._tag === "Folder") {
    return folderNode({ _tag: "PlacedFolder", entry, parent, ...placement })
  }
  // The same Spotify item can sit in several folders, so its key includes the
  // folder it is in.
  return {
    key: `${parent.id}/${entry.uri}`,
    value: { _tag: "PlacedItem", entry, parent, ...placement },
    children: null,
  }
}

export const folderTreeNodes = (tree: FolderTree) =>
  tree.map((folder, position) =>
    folderNode({
      _tag: "PlacedFolder",
      entry: folder,
      parent: null,
      position,
      siblingCount: tree.length,
    }),
  )
