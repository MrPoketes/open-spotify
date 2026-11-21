import { Effect } from "effect"
import { DesktopBridge } from "../../lib/desktop-bridge"
import type { FolderMove } from "./folder-moves"
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

// Carries out a move of a folder tree entry and says in the status message
// where it went ("Moved Warm-up up", "Moved Warm-up to Focus"), or why it
// failed. Every way of moving an entry reports it in these same words.
export function useRunFolderMove() {
  const changeFolders = useChangeFolders()
  return (move: FolderMove, entryName: string, newPlace: string) =>
    changeFolders(runOnMainProcess(move), {
      success: `Moved ${entryName} ${newPlace}`,
      failure: (error) => moveFailureMessage(entryName, error),
      failureLog: "Could not move a folder entry",
    })
}
