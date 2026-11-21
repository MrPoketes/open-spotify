import { Option, Schema } from "effect"
import { SpotifyItem } from "../../../shared/folders"
import type { TreeDrop } from "../../ui/tree-drop"
import type { TreeDropRules } from "../../ui/use-tree-drag-and-drop"
import { holdsItem } from "./add-to-folder-item"
import { type FolderMove, dropMove } from "./folder-moves"
import type { PlacedEntry } from "./folder-tree-nodes"
import { useAddFolderItem } from "./use-add-to-folder"
import { useRunFolderMove } from "./use-run-folder-move"

const destinationFolderId = (move: FolderMove) =>
  move._tag === "MoveFolder" ? move.request.parentFolderId : move.request.targetFolderId

// Where the entry went, as the keyboard moves say it: up or down among the
// same siblings, or to the folder it went to.
const newPlace = ({ dragged, target, position }: TreeDrop<PlacedEntry>, move: FolderMove) => {
  if (destinationFolderId(move) === (dragged.parent?.id ?? null)) {
    return move.request.position < dragged.position ? "up" : "down"
  }
  const destination =
    position === "inside" ? target.entry.name : (target.parent?.name ?? "the top level")
  return `to ${destination}`
}

const decodeSpotifyItem = Schema.decodeUnknownOption(SpotifyItem)

// A Spotify item dragged in from the library goes inside a folder that does
// not hold it yet, as Add to folder puts it there.
const additionOf = ({ dragged, target, position }: TreeDrop<PlacedEntry, unknown>) => {
  if (position !== "inside" || target._tag !== "PlacedFolder") return undefined
  const item = decodeSpotifyItem(dragged)
  if (Option.isNone(item) || holdsItem(target.entry, item.value.uri)) return undefined
  return { folder: target.entry, item: item.value }
}

// Rearranges the sidebar folder tree by dragging its rows, and adds library
// rows dragged onto its folders.
export function useDropFolderEntry(): TreeDropRules<PlacedEntry> {
  const runFolderMove = useRunFolderMove()
  const addFolderItem = useAddFolderItem()
  return {
    canDrop: (drop) => dropMove(drop) !== undefined,
    onDrop: (drop) => {
      const move = dropMove(drop)
      if (move === undefined) return
      runFolderMove(move, drop.dragged.entry.name, newPlace(drop, move))
    },
    canDropFromOutside: (drop) => additionOf(drop) !== undefined,
    onDropFromOutside: (drop) => {
      const addition = additionOf(drop)
      if (addition === undefined) return
      addFolderItem(addition.folder, addition.item)
    },
  }
}
