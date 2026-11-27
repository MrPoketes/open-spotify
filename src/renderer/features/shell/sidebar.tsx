import { FolderCog } from "lucide-react"
import { memo, use, useCallback, useMemo, useState } from "react"
import {
  collapsedSidebarWidth,
  defaultSidebarWidth,
  maximumSidebarWidth,
  minimumSidebarWidth,
} from "../../../shared/sidebar-width"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { saveSetting } from "../../lib/saved-setting"
import { MenuButton } from "../../ui/menu-button"
import { PaneDivider } from "../../ui/pane-divider"
import { RowDragArea } from "../../ui/row-drag-area"
import { FoldersFileOutcomeMessage } from "../folders/folders-file-outcome-message"
import { SidebarFolderTree } from "../folders/sidebar-folder-tree"
import { useFoldersFileActions } from "../folders/use-folders-file-actions"
import { Library } from "../library/library"
import { useKeyboardShortcut } from "../shortcuts/use-keyboard-shortcut"
import { SidebarRailContext } from "./sidebar-rail-context"
import { SidebarToggleButton } from "./sidebar-toggle-button"

interface SidebarProps {
  readonly savedWidth: number
  readonly savedCollapsed: boolean
}

function useSidebarCollapse(savedCollapsed: boolean) {
  const runtime = use(RendererRuntimeContext)
  const [isCollapsed, setCollapsedState] = useState(savedCollapsed)
  const setCollapsed = useCallback(
    (shouldCollapse: boolean) => {
      setCollapsedState(shouldCollapse)
      runtime.runFork(saveSetting("sidebarCollapsed", shouldCollapse))
    },
    [runtime],
  )
  const toggleCollapsed = useCallback(() => setCollapsed(!isCollapsed), [isCollapsed, setCollapsed])
  useKeyboardShortcut("toggleSidebar", toggleCollapsed)
  const rail = useMemo(
    () => (isCollapsed ? { expand: () => setCollapsed(false) } : null),
    [isCollapsed, setCollapsed],
  )
  return { isCollapsed, setCollapsed, toggleCollapsed, rail }
}

// The width lives here, not in the shell, so that resizing re-renders only
// the sidebar.
export function Sidebar({ savedWidth, savedCollapsed }: SidebarProps) {
  const runtime = use(RendererRuntimeContext)
  const [width, setWidth] = useState(savedWidth)
  const { isCollapsed, setCollapsed, toggleCollapsed, rail } = useSidebarCollapse(savedCollapsed)

  return (
    <>
      <nav
        aria-label="Library"
        style={{ width: isCollapsed ? collapsedSidebarWidth : width }}
        className="flex shrink-0 flex-col gap-3 pt-3"
      >
        <SidebarRailContext value={rail}>
          <SidebarContents isCollapsed={isCollapsed} onToggleCollapsed={toggleCollapsed} />
        </SidebarRailContext>
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
        collapse={{
          isCollapsed,
          collapsedWidth: collapsedSidebarWidth,
          onCollapsedChange: setCollapsed,
        }}
      />
    </>
  )
}

interface SidebarContentsProps {
  readonly isCollapsed: boolean
  readonly onToggleCollapsed: () => void
}

// Dragging the divider changes the width on every pointer move, and
// re-rendering the whole library each time made dragging slow. The rail
// hides the scrollbar, which would take the width of its artwork; the wheel
// and keyboard focus still scroll it.
const SidebarContents = memo(function SidebarContents({
  isCollapsed,
  onToggleCollapsed,
}: SidebarContentsProps) {
  return (
    <>
      <SidebarHeader isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed} />
      {/* One drag area holds both, so library rows can be dropped on folders. */}
      <RowDragArea>
        <div
          className={`min-h-0 flex-1 overflow-y-auto px-2 pb-2 ${isCollapsed ? "[scrollbar-width:none]" : ""}`}
        >
          <SidebarFolderTree />
          <Library />
        </div>
      </RowDragArea>
    </>
  )
})

// The outcome of a folders file action lives here, apart from the library, so
// that showing it does not re-render every library row. The toggle comes
// first in both widths, so it stays mounted and keeps focus when pressed.
function SidebarHeader({ isCollapsed, onToggleCollapsed }: SidebarContentsProps) {
  const foldersFileActions = useFoldersFileActions()

  return (
    <div className="flex flex-col px-2">
      <div className={`flex h-10 items-center gap-1 ${isCollapsed ? "justify-center" : ""}`}>
        <SidebarToggleButton isCollapsed={isCollapsed} onToggle={onToggleCollapsed} />
        <h2
          className={
            isCollapsed ? "sr-only" : "flex-1 font-display text-xl font-bold tracking-tight"
          }
        >
          Your library
        </h2>
        {isCollapsed ? null : (
          <MenuButton label="Folder options" icon={FolderCog} items={foldersFileActions.actions} />
        )}
      </div>
      {isCollapsed ? null : <FoldersFileOutcomeMessage outcome={foldersFileActions.outcome} />}
    </div>
  )
}
