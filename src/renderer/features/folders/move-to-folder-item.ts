import type { FolderTree } from "../../../shared/folders"
import type { MenuItem } from "../../ui/menu-list"
import { folderMenuItems } from "./folder-menu-items"
import {
  canMoveInto,
  canMoveToTopLevel,
  type FolderMove,
  moveIntoFolder,
  moveToTopLevel,
} from "./folder-moves"
import type { PlacedEntry } from "./folder-tree-nodes"

// Names the place a move ends in, for the message that reports it.
type RunFolderMove = (move: FolderMove, destination: string) => void

// Lists only the places the entry can move to, and is left out when there are
// none, such as for the only item in the only folder.
export const moveToFolderItem = (
  placed: PlacedEntry,
  tree: FolderTree,
  runMove: RunFolderMove,
): MenuItem | undefined => {
  const topLevelItems = canMoveToTopLevel(placed)
    ? [
        {
          label: "Top level",
          onSelect: () => runMove(moveToTopLevel(placed, tree), "the top level"),
        },
      ]
    : []
  const folderItems = tree.flatMap((topLevelFolder) =>
    folderMenuItems(topLevelFolder, (folder) =>
      canMoveInto(placed, folder)
        ? {
            id: folder.id,
            label: folder.name,
            onSelect: () => runMove(moveIntoFolder(placed, folder), folder.name),
          }
        : undefined,
    ),
  )
  const items = [...topLevelItems, ...folderItems]
  if (items.length === 0) {
    return undefined
  }
  return { label: "Move to folder", items }
}
