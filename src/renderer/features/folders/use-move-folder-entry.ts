import type { KeyboardEvent } from "react"
import type { FolderTree } from "../../../shared/folders"
import { useRowShortcut } from "../shortcuts/use-row-shortcut"
import { type FolderMove, stepMove } from "./folder-moves"
import type { PlacedEntry } from "./folder-tree-nodes"
import { moveToFolderItem } from "./move-to-folder-item"
import { useRunFolderMove } from "./use-run-folder-move"

// Moves a row of the sidebar folder tree one step among its siblings with
// Alt+Up and Alt+Down, or to the place picked from its Move to folder menu.
export function useMoveFolderEntry(placed: PlacedEntry, tree: FolderTree) {
  const runFolderMove = useRunFolderMove()
  const moveUpShortcut = useRowShortcut("moveFolderEntryUp")
  const moveDownShortcut = useRowShortcut("moveFolderEntryDown")
  const entryName = placed.entry.name

  const runMove = (move: FolderMove, success: string) => runFolderMove(move, entryName, success)

  const stepForKey = (event: KeyboardEvent) => {
    if (moveUpShortcut.isPressed(event)) return -1
    if (moveDownShortcut.isPressed(event)) return 1
    return undefined
  }

  return {
    moveWithKey: (event: KeyboardEvent) => {
      const step = stepForKey(event)
      if (step === undefined) return
      event.preventDefault()
      const move = stepMove(placed, step)
      if (move === undefined) return
      runMove(move, `Moved ${entryName} ${step === -1 ? "up" : "down"}`)
    },
    ariaKeyShortcuts: `${moveUpShortcut.ariaKeyShortcuts} ${moveDownShortcut.ariaKeyShortcuts}`,
    moveToFolderItem: moveToFolderItem(placed, tree, (move, destination) =>
      runMove(move, `Moved ${entryName} to ${destination}`),
    ),
  }
}
