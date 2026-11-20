import { type ReactNode, useState } from "react"
import {
  defaultSidebarWidth,
  maximumSidebarWidth,
  minimumSidebarWidth,
} from "../../../shared/sidebar-width"
import { rendererRuntime } from "../../lib/renderer-runtime"
import { PaneDivider } from "../../ui/pane-divider"
import { NowPlayingBar } from "./now-playing-bar"
import { saveSidebarWidth } from "./saved-sidebar-width"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { useHistoryShortcuts } from "./use-history-shortcuts"

interface AppShellProps {
  readonly savedSidebarWidth: number
  readonly platform: string
  readonly children: ReactNode
}

export function AppShell({ savedSidebarWidth, platform, children }: AppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(savedSidebarWidth)
  useHistoryShortcuts(platform)

  return (
    <div className="flex h-screen flex-col gap-2 p-2">
      <div className="flex min-h-0 flex-1">
        <Sidebar width={sidebarWidth} />
        <PaneDivider
          label="Resize sidebar"
          paneWidth={sidebarWidth}
          minimumWidth={minimumSidebarWidth}
          maximumWidth={maximumSidebarWidth}
          defaultWidth={defaultSidebarWidth}
          onResize={setSidebarWidth}
          onResizeEnd={(width) => rendererRuntime.runFork(saveSidebarWidth(width))}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-medium bg-surface">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <NowPlayingBar />
    </div>
  )
}
