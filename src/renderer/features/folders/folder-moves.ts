import type {
  Folder,
  FolderTree,
  MoveFolderItemRequest,
  MoveFolderRequest,
} from "../../../shared/folders"
import type { TreeDrop } from "../../ui/tree-drop"
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

// The main process refuses to put a folder inside itself or its descendants.
const canHold = (target: Folder, placed: PlacedEntry) =>
  placed._tag === "PlacedItem" ||
  (target.id !== placed.entry.id && !holdsFolder(placed.entry.entries, target.id))

// Moving into the folder the entry is already in would change nothing.
export const canMoveInto = (placed: PlacedEntry, target: Folder) =>
  target.id !== placed.parent?.id && canHold(target, placed)

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

// The main process counts the position among the parent's other entries, so
// an entry that moves down within its parent lands one place higher than the
// line it was dropped on.
const positionAmongOthers = (dragged: PlacedEntry, target: PlacedEntry, lineIndex: number) =>
  target.parent?.id === dragged.parent?.id && dragged.position < lineIndex
    ? lineIndex - 1
    : lineIndex

// The top level holds only folders.
const placeIn = (
  dragged: PlacedEntry,
  parent: Folder | null,
  position: number,
): FolderMove | undefined => {
  if (parent === null) {
    return dragged._tag === "PlacedFolder" ? placeFolder(dragged.entry, null, position) : undefined
  }
  if (!canHold(parent, dragged)) {
    return undefined
  }
  return dragged._tag === "PlacedItem"
    ? placeItem(dragged, parent.id, position)
    : placeFolder(dragged.entry, parent.id, position)
}

// A drop on the line before or after an entry puts the dragged entry beside
// it. A drop that leaves the entry where it is changes nothing, so it is not
// a move.
const moveBeside = (
  dragged: PlacedEntry,
  target: PlacedEntry,
  side: "before" | "after",
): FolderMove | undefined => {
  const lineIndex = side === "before" ? target.position : target.position + 1
  const position = positionAmongOthers(dragged, target, lineIndex)
  if (target.parent?.id === dragged.parent?.id && position === dragged.position) {
    return undefined
  }
  return placeIn(dragged, target.parent, position)
}

export const dropMove = ({
  dragged,
  target,
  position,
}: TreeDrop<PlacedEntry>): FolderMove | undefined => {
  if (position !== "inside") {
    return moveBeside(dragged, target, position)
  }
  if (target._tag !== "PlacedFolder" || !canMoveInto(dragged, target.entry)) {
    return undefined
  }
  return moveIntoFolder(dragged, target.entry)
}
