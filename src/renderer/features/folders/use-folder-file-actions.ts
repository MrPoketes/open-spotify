import { Effect } from "effect"
import { use, useState } from "react"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import type { MenuAction } from "../../ui/menu-button"

export interface FolderFileOutcome {
  readonly kind: "success" | "failure"
  readonly message: string
}

const success = (message: string): FolderFileOutcome => ({ kind: "success", message })

const failure = (message: string): FolderFileOutcome => ({ kind: "failure", message })

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

const importFolders = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const outcome = yield* bridge.importFolders
  if (outcome._tag === "FileDialogCanceled") return null
  const folderNoun = outcome.folderCount === 1 ? "folder" : "folders"
  return success(`Imported ${outcome.folderCount} ${folderNoun}.`)
}).pipe(
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
    DesktopBridgeError: () =>
      Effect.succeed(failure(`The file couldn't be imported. ${nothingImported}`)),
  }),
)

export function useFolderFileActions() {
  const runtime = use(RendererRuntimeContext)
  const [outcome, setOutcome] = useState<FolderFileOutcome | null>(null)

  const actions: ReadonlyArray<MenuAction> = [
    {
      label: "Export folders…",
      onSelect: () => runtime.runFork(exportFolders.pipe(Effect.map(setOutcome))),
    },
    {
      label: "Import folders…",
      onSelect: () => runtime.runFork(importFolders.pipe(Effect.map(setOutcome))),
    },
  ]

  return { actions, outcome }
}
