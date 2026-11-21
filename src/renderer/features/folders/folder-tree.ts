import { Effect } from "effect"
import { createContext, use } from "react"
import type { FolderTree } from "../../../shared/folders"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"
import type { ReplaceableLoad } from "../../lib/use-load"

export const loadFolderTree = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  return yield* bridge.getFolderTree
})

export type SharedFolderTree = ReplaceableLoad<FolderTree, DesktopBridgeError>

// FoldersProvider in the app shell loads the tree once for every menu and the
// folder page, so a change made in one shows in all of them. A screen rendered
// without it sees the tree loading forever.
export const FolderTreeContext = createContext<SharedFolderTree>({
  state: { status: "loading" },
  retry: () => undefined,
  replace: () => undefined,
})

export const useFolderTree = () => use(FolderTreeContext)

// Reads the tree again after a change, so every menu and the open folder page
// show it. A failed read leaves the tree as it was.
export function useReadFolderTreeAgain() {
  const { replace } = useFolderTree()
  return loadFolderTree.pipe(
    Effect.andThen((tree) => Effect.sync(() => replace(tree))),
    Effect.catch((error) =>
      Effect.logWarning("Could not read the folders again after a change", error),
    ),
  )
}
