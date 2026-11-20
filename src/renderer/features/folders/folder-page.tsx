import { Effect } from "effect"
import { Folder as FolderIcon } from "lucide-react"
import { type FolderView, defaultFolderView } from "../../../shared/folder-view"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { loadSavedSetting } from "../../lib/saved-setting"
import { useLoad } from "../../lib/use-load"
import { useSavedSettingState } from "../../lib/use-saved-setting-state"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { PageHeader } from "../../ui/page-header"
import { FolderBreadcrumb } from "./folder-breadcrumb"
import { FolderEntryGrid } from "./folder-entry-grid"
import { FolderEntryList } from "./folder-entry-list"
import { type FolderLocation, locateFolder } from "./folder-location"
import { FolderViewToggle } from "./folder-view-toggle"
import { formatItemCount } from "./format-item-count"

const loadFolderPage = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  return yield* Effect.all({
    tree: bridge.getFolderTree,
    savedView: loadSavedSetting("folderView", defaultFolderView),
  })
})

export function FolderPage({ folderId }: { readonly folderId: string }) {
  const { state, retry } = useLoad(loadFolderPage, "The folder failed to load")

  if (state.status === "loading") {
    return <output className="text-muted">Loading folder…</output>
  }
  if (state.status === "failed") {
    return <ErrorWithRetry message="This folder didn't load." onRetry={retry} />
  }
  const location = locateFolder(state.value.tree, folderId)
  if (location === undefined) {
    return <p className="text-muted">This folder doesn't exist. It may have been deleted.</p>
  }
  return <LoadedFolder location={location} savedView={state.value.savedView} />
}

interface LoadedFolderProps {
  readonly location: FolderLocation
  readonly savedView: FolderView
}

function LoadedFolder({ location, savedView }: LoadedFolderProps) {
  const [view, changeView] = useSavedSettingState("folderView", savedView)
  const { folder, ancestors } = location

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {ancestors.length > 0 && <FolderBreadcrumb folder={folder} ancestors={ancestors} />}
        <PageHeader
          kind="Folder"
          title={folder.name}
          cover={{ sources: [], placeholderIcon: FolderIcon }}
        >
          <p className="text-xs text-muted tabular-nums">
            {formatItemCount(folder.entries.length)}
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
