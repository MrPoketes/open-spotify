import { Effect } from "effect"
import type { FolderChangeError } from "../../../shared/folders"
import type { DesktopBridgeError } from "../../lib/desktop-bridge"
import type { RendererServices } from "../../lib/renderer-runtime"
import { type AnnouncedOutcome, useRunAnnounced } from "../../ui/use-run-announced"
import { useReadFolderTreeAgain } from "./folder-tree"

export type FolderChangeFailure = FolderChangeError | DesktopBridgeError

// Runs a folder change and says in the status message whether it worked. It
// reads the tree again even after a failure, because part of the change, such
// as a new folder, may have happened, and because a folder that is not found
// means the tree changed elsewhere, such as in another window.
export function useChangeFolders() {
  const runAnnounced = useRunAnnounced()
  const readTreeAgain = useReadFolderTreeAgain()

  return (
    change: Effect.Effect<unknown, FolderChangeFailure, RendererServices>,
    outcome: AnnouncedOutcome<FolderChangeFailure>,
  ) =>
    runAnnounced(change.pipe(Effect.ensuring(readTreeAgain)), {
      ...outcome,
      failure: (error) =>
        error._tag === "FolderNotFound"
          ? "That folder no longer exists, so your folders were reloaded."
          : outcome.failure(error),
    })
}
