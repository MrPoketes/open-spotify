import { Effect } from "effect"
import { use, useState } from "react"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { formatCount } from "../../ui/format-count"
import type { MenuAction } from "../../ui/menu-items"
import { useReadFolderTreeAgain } from "./folder-tree"

export interface FoldersFileOutcome {
  readonly kind: "success" | "failure"
  readonly message: string
}

const success = (message: string): FoldersFileOutcome => ({ kind: "success", message })

const failure = (message: string): FoldersFileOutcome => ({ kind: "failure", message })

const nothingImported = "No folders were imported."

// A cancelled dialog yields null, which clears the previous outcome.
const exportFolders = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const reply = yield* bridge.exportFolders
  return reply._tag === "FoldersExported" ? success("Exported your folders.") : null
}).pipe(
  Effect.catchTag("DesktopBridgeError", () =>
    Effect.succeed(failure("Your folders couldn't be exported.")),
  ),
)

const importFolders = Effect.fn("importFolders")(
  function* (readTreeAgain: Effect.Effect<void, never, DesktopBridge>) {
    const bridge = yield* DesktopBridge
    const reply = yield* bridge.importFolders
    if (reply._tag === "FileDialogCanceled") return null
    yield* readTreeAgain
    return success(`Imported ${formatCount(reply.folderCount, "folder", "folders")}.`)
  },
  Effect.catchTags({
    FoldersFileNotJson: () => Effect.succeed(failure(`That file isn't JSON. ${nothingImported}`)),
    FoldersFileUnsupportedVersion: (error) =>
      Effect.succeed(
        failure(
          `That file uses folders format version ${error.version}, which this version of Open Spotify can't read. ${nothingImported}`,
        ),
      ),
    FoldersFileInvalid: () =>
      Effect.succeed(failure(`That file isn't an Open Spotify folders file. ${nothingImported}`)),
    FoldersFileDamaged: () =>
      Effect.succeed(
        failure(
          `That folders file is damaged: a folder or item in it isn't valid. ${nothingImported}`,
        ),
      ),
    DesktopBridgeError: () =>
      Effect.succeed(failure(`The file couldn't be imported. ${nothingImported}`)),
  }),
)

export function useFoldersFileActions() {
  const runtime = use(RendererRuntimeContext)
  const [outcome, setOutcome] = useState<FoldersFileOutcome | null>(null)
  const readTreeAgain = useReadFolderTreeAgain()

  // Clearing the outcome first means a repeated outcome changes the page
  // again, so screen readers announce it again.
  const runAction = (action: Effect.Effect<FoldersFileOutcome | null, never, DesktopBridge>) => {
    setOutcome(null)
    runtime.runFork(action.pipe(Effect.map(setOutcome)))
  }

  const actions: ReadonlyArray<MenuAction> = [
    { label: "Export folders…", onSelect: () => runAction(exportFolders) },
    { label: "Import folders…", onSelect: () => runAction(importFolders(readTreeAgain)) },
  ]

  return { actions, outcome }
}
