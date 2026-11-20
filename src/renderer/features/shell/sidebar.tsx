import { FolderCog } from "lucide-react"
import { MenuButton } from "../../ui/menu-button"
import { FolderFileOutcomeMessage } from "../folders/folder-file-outcome-message"
import { useFolderFileActions } from "../folders/use-folder-file-actions"
import { Library } from "../library/library"

export function Sidebar({ width }: { readonly width: number }) {
  const folderFiles = useFolderFileActions()

  return (
    <nav
      aria-label="Library"
      style={{ width }}
      className="flex shrink-0 flex-col gap-4 rounded-medium bg-surface pt-4"
    >
      <div className="flex flex-col px-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Your library</h2>
          <MenuButton label="Folder options" icon={FolderCog} actions={folderFiles.actions} />
        </div>
        <FolderFileOutcomeMessage outcome={folderFiles.outcome} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Library />
      </div>
    </nav>
  )
}
