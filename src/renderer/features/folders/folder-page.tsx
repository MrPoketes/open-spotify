import { Folder as FolderIcon } from "lucide-react"
import { defaultFolderView, type FolderView } from "../../../shared/folder-view"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { useSavedSettingState } from "../../lib/use-saved-setting-state"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { formatCount } from "../../ui/format-count"
import { LoadingMessage } from "../../ui/loading-message"
import { PageHeader } from "../../ui/page-header"
import { FolderBreadcrumb } from "./folder-breadcrumb"
import { FolderEntryGrid } from "./folder-entry-grid"
import { FolderEntryList } from "./folder-entry-list"
import { locateFolder, type FolderLocation } from "./folder-location"
import { FolderPlayButton } from "./folder-play-button"
import { folderTrackUris } from "./folder-track-uris"
import { useFolderTree } from "./folder-tree"
import { FolderViewToggle } from "./folder-view-toggle"

// The tree is the one every Add to folder menu shares, so the page shows an
// item added from a menu at once.
export function FolderPage({ folderId }: { readonly folderId: string }) {
  const folderTree = useFolderTree()
  const savedView = useLoad(
    loadSavedSetting("folderView", defaultFolderView),
    "The folder view failed to load",
  )

  if (folderTree.state.status === "failed") {
    return <ErrorWithRetry message="This folder didn't load." onRetry={folderTree.retry} />
  }
  if (folderTree.state.status === "loading" || savedView.state.status !== "loaded") {
    return <LoadingMessage>Loading folder…</LoadingMessage>
  }
  const location = locateFolder(folderTree.state.value, folderId)
  if (location === undefined) {
    return <p className="text-muted">This folder doesn't exist. It may have been deleted.</p>
  }
  return <LoadedFolder location={location} savedView={savedView.state.value} />
}

interface LoadedFolderProps {
  readonly location: FolderLocation
  readonly savedView: FolderView
}

function LoadedFolder({ location, savedView }: LoadedFolderProps) {
  const [view, changeView] = useSavedSettingState("folderView", savedView)
  const { folder, ancestors } = location
  const trackUris = folderTrackUris(folder)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {ancestors.length > 0 && <FolderBreadcrumb folder={folder} ancestors={ancestors} />}
        <PageHeader
          kind="Folder"
          title={folder.name}
          cover={{ sources: [], placeholderIcon: FolderIcon }}
          playButton={
            trackUris.length === 0 ? undefined : (
              <FolderPlayButton folder={folder} trackUris={trackUris} />
            )
          }
        >
          <p className="text-xs text-muted tabular-nums">
            {formatCount(folder.entries.length, "item", "items")}
          </p>
        </PageHeader>
      </div>
      {folder.entries.length === 0 && (
        <p className="text-muted">
          This folder is empty. Choose “Add to folder” on a playlist, album, artist, show, or track
          to put it here.
        </p>
      )}
      {folder.entries.length > 0 && (
        <>
          <div className="flex justify-end">
            <FolderViewToggle view={view} onChange={changeView} />
          </div>
          {view === "grid" && <FolderEntryGrid entries={folder.entries} />}
          {view === "list" && <FolderEntryList entries={folder.entries} />}
        </>
      )}
    </div>
  )
}
