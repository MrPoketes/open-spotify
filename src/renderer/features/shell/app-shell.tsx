import { useCallback, useState, type ReactNode } from "react"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { FoldersProvider } from "../folders/folders-provider"
import { LibraryPlaylistsProvider } from "../library/library-playlists-provider"
import { NowPlayingBar } from "../playback/now-playing-bar"
import { OpenDevicePickerContext } from "../playback/open-device-picker-context"
import { QueuePane } from "../queue/queue-pane"
import { useQueuePane } from "../queue/use-queue-pane"
import { IsMacContext } from "../shortcuts/is-mac-context"
import { ShortcutsDialog } from "../shortcuts/shortcuts-dialog"
import { ThisComputerProvider } from "../this-computer/this-computer-provider"
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

// The layout's own hooks register shortcuts, so the platform has to be
// provided above them.
export function AppShell({ platform, ...layoutProps }: AppShellProps) {
  return (
    <IsMacContext value={platform === "darwin"}>
      <AppShellLayout {...layoutProps} />
    </IsMacContext>
  )
}

function AppShellLayout({
  savedSidebarWidth,
  savedRightPaneWidth,
  savedTrackListDensity,
  children,
}: Omit<AppShellProps, "platform">) {
  const { isQueueOpen, toggleQueue, closeQueue, queueButtonRef, queuePaneRef } = useQueuePane()
  const [isDevicePickerOpen, setDevicePickerOpen] = useState(false)
  const openDevicePicker = useCallback(() => setDevicePickerOpen(true), [])
  useHistoryShortcuts()

  return (
    <StatusMessageProvider>
      <ThisComputerProvider>
        <LibraryPlaylistsProvider>
          <FoldersProvider>
            <div className="flex h-screen flex-col gap-2 p-2">
              <div className="flex min-h-0 flex-1">
                <Sidebar savedWidth={savedSidebarWidth} />
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
                <QueuePane
                  ref={queuePaneRef}
                  isOpen={isQueueOpen}
                  savedWidth={savedRightPaneWidth}
                  onClose={closeQueue}
                />
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
          <ShortcutsDialog />
        </LibraryPlaylistsProvider>
      </ThisComputerProvider>
    </StatusMessageProvider>
  )
}
