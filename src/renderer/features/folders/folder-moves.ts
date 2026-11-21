import type {
  Folder,
  FolderTree,
  MoveFolderItemRequest,
  MoveFolderRequest,
} from "../../../shared/folders"
import { holdsFolder } from "./folder-location"
import type { PlacedEntry, PlacedFolder, PlacedItem } from "./folder-tree-nodes"

// The rules for rearranging the folder tree, shared by every way of moving an
// entry. A move names the main-process channel request that carries it out.
export type FolderMove =
  | { readonly _tag: "MoveFolder"; readonly request: MoveFolderRequest }
  | { readonly _tag: "MoveFolderItem"; readonly request: MoveFolderItemRequest }

const placeFolder = (
  folder: Folder,
  parentFolderId: string | null,
  position: number,
): FolderMove => ({
  _tag: "MoveFolder",
  request: { folderId: folder.id, parentFolderId, position },
})

const placeItem = (placed: PlacedItem, targetFolderId: string, position: number): FolderMove => ({
  _tag: "MoveFolderItem",
  request: { folderId: placed.parent.id, uri: placed.entry.uri, targetFolderId, position },
})

// The main process counts a position among the parent's other entries, so a
// step lands one place over. There is no step past either end.
export const stepMove = (placed: PlacedEntry, step: -1 | 1): FolderMove | undefined => {
  const position = placed.position + step
  if (position < 0 || position >= placed.siblingCount) {
    return undefined
  }
  if (placed._tag === "PlacedItem") {
    return placeItem(placed, placed.parent.id, position)
  }
  return placeFolder(placed.entry, placed.parent?.id ?? null, position)
}

// Moving into the folder the entry is already in would change nothing, and
// the main process refuses to put a folder inside itself or its descendants.
export const canMoveInto = (placed: PlacedEntry, target: Folder) => {
  if (target.id === placed.parent?.id) {
    return false
  }
  if (placed._tag === "PlacedItem") {
    return true
  }
  return target.id !== placed.entry.id && !holdsFolder(placed.entry.entries, target.id)
}

export const canMoveToTopLevel = (placed: PlacedEntry): placed is PlacedFolder =>
  placed._tag === "PlacedFolder" && placed.parent !== null

// An entry moved into another folder, or a folder moved to the top level,
// goes last there.
export const moveIntoFolder = (placed: PlacedEntry, target: Folder): FolderMove =>
  placed._tag === "PlacedItem"
    ? placeItem(placed, target.id, target.entries.length)
    : placeFolder(placed.entry, target.id, target.entries.length)

export const moveToTopLevel = (placed: PlacedFolder, tree: FolderTree): FolderMove =>
  placeFolder(placed.entry, null, tree.length)
