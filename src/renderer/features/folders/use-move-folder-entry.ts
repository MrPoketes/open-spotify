import { Effect } from "effect"
import type { KeyboardEvent } from "react"
import type { FolderTree } from "../../../shared/folders"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { useRowShortcut } from "../shortcuts/use-row-shortcut"
import { type FolderMove, stepMove } from "./folder-moves"
import type { PlacedEntry } from "./folder-tree-nodes"
import { moveToFolderItem } from "./move-to-folder-item"
import { type FolderChangeFailure, useChangeFolders } from "./use-change-folders"

// The main process refuses a move made against a tree that has changed since
// the renderer read it, for example in another window or by an import.
// useChangeFolders already explains a folder that is gone.
const refusalReasons: Partial<Record<FolderChangeFailure["_tag"], string>> = {
  FolderMovedIntoOwnSubtree: "A folder can't go inside itself.",
  FolderItemNotFound: "It's no longer in that folder.",
}

const moveFailureMessage = (entryName: string, error: FolderChangeFailure) => {
  const reason = refusalReasons[error._tag]
  const failure = `Couldn't move ${entryName}.`
  return reason === undefined ? failure : `${failure} ${reason}`
}

const runOnMainProcess = (move: FolderMove) =>
  Effect.gen(function* () {
    const bridge = yield* DesktopBridge
    if (move._tag === "MoveFolder") {
      return yield* bridge.moveFolder(move.request)
    }
    return yield* bridge.moveFolderItem(move.request)
  })

// Moves a row of the sidebar folder tree one step among its siblings with
// Alt+Up and Alt+Down, or to the place picked from its Move to folder menu.
export function useMoveFolderEntry(placed: PlacedEntry, tree: FolderTree) {
  const changeFolders = useChangeFolders()
  const moveUpShortcut = useRowShortcut("moveFolderEntryUp")
  const moveDownShortcut = useRowShortcut("moveFolderEntryDown")
  const entryName = placed.entry.name

  const runMove = (move: FolderMove, success: string) =>
    changeFolders(runOnMainProcess(move), {
      success,
      failure: (error) => moveFailureMessage(entryName, error),
      failureLog: "Could not move a folder entry",
    })

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
