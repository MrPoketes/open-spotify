import { type ReactNode, useCallback, useState } from "react"
import { useLoad } from "../../lib/use-load"
import { AskForFolderNameContext } from "./ask-for-folder-name"
import { FolderTreeContext, loadFolderTree } from "./folder-tree"
import { NewFolderDialog } from "./new-folder-dialog"

// Shares what every Add to folder menu needs: the folder tree and the New
// folder dialog.
export function FoldersProvider({ children }: { readonly children: ReactNode }) {
  const folderTree = useLoad(loadFolderTree, "The folders failed to load")
  const [onFolderName, setOnFolderName] = useState<((name: string) => void) | null>(null)
  // Every library row reads this, so a new function on each render would
  // re-render them all whenever the app shell renders.
  const askForFolderName = useCallback(
    (onName: (name: string) => void) => setOnFolderName(() => onName),
    [],
  )

  return (
    <FolderTreeContext value={folderTree}>
      <AskForFolderNameContext value={askForFolderName}>
        {children}
        {onFolderName === null ? null : (
          <NewFolderDialog onCreate={onFolderName} onClose={() => setOnFolderName(null)} />
        )}
      </AskForFolderNameContext>
    </FolderTreeContext>
  )
}
