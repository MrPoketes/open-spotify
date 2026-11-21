import type { TreeDrop } from "../../ui/tree-drop"
import type { TreeDropRules } from "../../ui/use-tree-drag-and-drop"
import { type FolderMove, dropMove } from "./folder-moves"
import type { PlacedEntry } from "./folder-tree-nodes"
import { useRunFolderMove } from "./use-run-folder-move"

const destinationFolderId = (move: FolderMove) =>
  move._tag === "MoveFolder" ? move.request.parentFolderId : move.request.targetFolderId

// Says where the entry went in the same words as the keyboard moves: up or
// down among the same siblings, or the folder it went to.
const dropMessage = ({ dragged, target, position }: TreeDrop<PlacedEntry>, move: FolderMove) => {
  const entryName = dragged.entry.name
  if (destinationFolderId(move) === (dragged.parent?.id ?? null)) {
    return `Moved ${entryName} ${move.request.position < dragged.position ? "up" : "down"}`
  }
  const destination =
    position === "inside" ? target.entry.name : (target.parent?.name ?? "the top level")
  return `Moved ${entryName} to ${destination}`
}

// Rearranges the sidebar folder tree by dragging its rows.
export function useDropFolderEntry(): TreeDropRules<PlacedEntry> {
  const runFolderMove = useRunFolderMove()
  return {
    canDrop: (drop) => dropMove(drop) !== undefined,
    onDrop: (drop) => {
      const move = dropMove(drop)
      if (move === undefined) return
      runFolderMove(move, drop.dragged.entry.name, dropMessage(drop, move))
    },
  }
}
