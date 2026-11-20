import { FolderCog } from "lucide-react"
import { MenuButton } from "../../ui/menu-button"
import { FoldersFileOutcomeMessage } from "../folders/folders-file-outcome-message"
import { useFoldersFileActions } from "../folders/use-folders-file-actions"
import { Library } from "../library/library"

export function Sidebar({ width }: { readonly width: number }) {
  const foldersFileActions = useFoldersFileActions()

  return (
    <nav
      aria-label="Library"
      style={{ width }}
      className="flex shrink-0 flex-col gap-4 rounded-medium bg-surface pt-4"
    >
      <div className="flex flex-col px-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Your library</h2>
          <MenuButton
            label="Folder options"
            icon={FolderCog}
            actions={foldersFileActions.actions}
          />
        </div>
        <FoldersFileOutcomeMessage outcome={foldersFileActions.outcome} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Library />
      </div>
    </nav>
  )
}
