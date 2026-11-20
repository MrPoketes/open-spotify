import { Effect, Option } from "effect"
import type { FolderView } from "../../../shared/folder-view"
import { DesktopBridge } from "../../lib/desktop-bridge"

const defaultFolderView: FolderView = "grid"

export const loadSavedFolderView = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const savedView = yield* bridge.getSetting("folderView")
  return Option.getOrElse(savedView, () => defaultFolderView)
}).pipe(
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not read the saved folder view", error).pipe(
      Effect.as(defaultFolderView),
    ),
  ),
)

// A view that fails to save only costs the user their choice on the next
// visit, so it must not interrupt them now.
export const saveFolderView = Effect.fn("saveFolderView")(function* (view: FolderView) {
  const bridge = yield* DesktopBridge
  yield* bridge
    .setSetting("folderView", view)
    .pipe(
      Effect.catchTag("DesktopBridgeError", (error) =>
        Effect.logWarning("Could not save the folder view", error),
      ),
    )
})
