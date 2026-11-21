import { FolderCog } from "lucide-react"
import { memo, use, useState } from "react"
import {
  defaultSidebarWidth,
  maximumSidebarWidth,
  minimumSidebarWidth,
} from "../../../shared/sidebar-width"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { saveSetting } from "../../lib/saved-setting"
import { MenuButton } from "../../ui/menu-button"
import { PaneDivider } from "../../ui/pane-divider"
import { FoldersFileOutcomeMessage } from "../folders/folders-file-outcome-message"
import { SidebarFolderTree } from "../folders/sidebar-folder-tree"
import { useFoldersFileActions } from "../folders/use-folders-file-actions"
import { Library } from "../library/library"

// The width lives here, not in the shell, so that resizing re-renders only
// the sidebar.
export function Sidebar({ savedWidth }: { readonly savedWidth: number }) {
  const runtime = use(RendererRuntimeContext)
  const [width, setWidth] = useState(savedWidth)

  return (
    <>
      <nav
        aria-label="Library"
        style={{ width }}
        className="flex shrink-0 flex-col gap-4 rounded-medium bg-surface pt-4"
      >
        <SidebarContents />
      </nav>
      <PaneDivider
        label="Resize sidebar"
        paneSide="left"
        paneWidth={width}
        minimumWidth={minimumSidebarWidth}
        maximumWidth={maximumSidebarWidth}
        defaultWidth={defaultSidebarWidth}
        onResize={setWidth}
        onResizeEnd={(newWidth) => runtime.runFork(saveSetting("sidebarWidth", newWidth))}
      />
    </>
  )
}

// Dragging the divider changes the width on every pointer move, and
// re-rendering the whole library each time made dragging slow.
const SidebarContents = memo(function SidebarContents() {
  const foldersFileActions = useFoldersFileActions()

  return (
    <>
      <div className="flex flex-col px-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Your library</h2>
          <MenuButton label="Folder options" icon={FolderCog} items={foldersFileActions.actions} />
        </div>
        <FoldersFileOutcomeMessage outcome={foldersFileActions.outcome} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <SidebarFolderTree />
        <Library />
      </div>
    </>
  )
})
