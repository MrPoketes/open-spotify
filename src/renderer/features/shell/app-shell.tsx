import { type ReactNode, use, useCallback, useState } from "react"
import {
  defaultRightPaneWidth,
  maximumRightPaneWidth,
  minimumRightPaneWidth,
} from "../../../shared/right-pane-width"
import {
  defaultSidebarWidth,
  maximumSidebarWidth,
  minimumSidebarWidth,
} from "../../../shared/sidebar-width"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { saveSetting } from "../../lib/saved-setting"
import { PaneDivider } from "../../ui/pane-divider"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { FoldersProvider } from "../folders/folders-provider"
import { LibraryPlaylistsProvider } from "../library/library-playlists-provider"
import { NowPlayingBar } from "../playback/now-playing-bar"
import { OpenDevicePickerContext } from "../playback/open-device-picker-context"
import { QueuePane } from "../queue/queue-pane"
import { useQueuePane } from "../queue/use-queue-pane"
import { EditablePlaylistsProvider } from "../track-actions/editable-playlists-provider"
import { TrackListDensityProvider } from "../track-list/track-list-density-provider"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { useHistoryShortcuts } from "./use-history-shortcuts"

interface AppShellProps {
  readonly savedSidebarWidth: number
  readonly savedRightPaneWidth: number
  readonly savedTrackListDensity: TrackListDensity
  readonly platform: string
  readonly children: ReactNode
}

export function AppShell({
  savedSidebarWidth,
  savedRightPaneWidth,
  savedTrackListDensity,
  platform,
  children,
}: AppShellProps) {
  const runtime = use(RendererRuntimeContext)
  const [sidebarWidth, setSidebarWidth] = useState(savedSidebarWidth)
  const [rightPaneWidth, setRightPaneWidth] = useState(savedRightPaneWidth)
  const { isQueueOpen, toggleQueue, closeQueue, queueButtonRef, queuePaneRef } = useQueuePane()
  const [isDevicePickerOpen, setDevicePickerOpen] = useState(false)
  const openDevicePicker = useCallback(() => setDevicePickerOpen(true), [])
  useHistoryShortcuts(platform)

  return (
    <StatusMessageProvider>
      <LibraryPlaylistsProvider>
        <FoldersProvider>
          <div className="flex h-screen flex-col gap-2 p-2">
            <div className="flex min-h-0 flex-1">
              <Sidebar width={sidebarWidth} />
              <PaneDivider
                label="Resize sidebar"
                paneSide="left"
                paneWidth={sidebarWidth}
                minimumWidth={minimumSidebarWidth}
                maximumWidth={maximumSidebarWidth}
                defaultWidth={defaultSidebarWidth}
                onResize={setSidebarWidth}
                onResizeEnd={(width) => runtime.runFork(saveSetting("sidebarWidth", width))}
              />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-medium bg-surface">
                <TopBar />
                <main className="min-h-0 flex-1 overflow-y-auto p-6">
                  <TrackListDensityProvider savedDensity={savedTrackListDensity}>
                    <EditablePlaylistsProvider>
                      <OpenDevicePickerContext value={openDevicePicker}>
                        {children}
                      </OpenDevicePickerContext>
                    </EditablePlaylistsProvider>
                  </TrackListDensityProvider>
                </main>
              </div>
              {isQueueOpen && (
                <>
                  <PaneDivider
                    label="Resize queue"
                    paneSide="right"
                    paneWidth={rightPaneWidth}
                    minimumWidth={minimumRightPaneWidth}
                    maximumWidth={maximumRightPaneWidth}
                    defaultWidth={defaultRightPaneWidth}
                    onResize={setRightPaneWidth}
                    onResizeEnd={(width) => runtime.runFork(saveSetting("rightPaneWidth", width))}
                  />
                  <QueuePane ref={queuePaneRef} width={rightPaneWidth} onClose={closeQueue} />
                </>
              )}
            </div>
            <NowPlayingBar
              isQueueOpen={isQueueOpen}
              onQueueToggle={toggleQueue}
              queueButtonRef={queueButtonRef}
              isDevicePickerOpen={isDevicePickerOpen}
              onDevicePickerOpenChange={setDevicePickerOpen}
            />
          </div>
        </FoldersProvider>
      </LibraryPlaylistsProvider>
    </StatusMessageProvider>
  )
}
