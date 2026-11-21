import type { Folder, SpotifyItem } from "../../../shared/folders"
import type { MenuItem } from "../../ui/menu-list"
import { folderMenuItems } from "./folder-menu-items"
import type { SharedFolderTree } from "./folder-tree"

export interface AddToFolderActions {
  readonly toggleItem: (folder: Folder, item: SpotifyItem) => void
  readonly addToNewFolder: (item: SpotifyItem) => void
  readonly explainMissingFolders: () => void
}

export const holdsItem = (folder: Folder, uri: string) =>
  folder.entries.some((entry) => entry._tag === "SpotifyItem" && entry.uri === uri)

// Until the folders load, the item says why instead of opening a submenu that
// could not mark the folders that hold the item.
export const addToFolderItem = (
  item: SpotifyItem,
  folderTree: SharedFolderTree["state"],
  actions: AddToFolderActions,
): MenuItem => {
  if (folderTree.status !== "loaded") {
    return { label: "Add to folder", onSelect: actions.explainMissingFolders }
  }
  return {
    label: "Add to folder",
    items: [
      ...folderTree.value.flatMap((topLevelFolder) =>
        folderMenuItems(topLevelFolder, (folder) => ({
          id: folder.id,
          label: folder.name,
          checked: holdsItem(folder, item.uri),
          onSelect: () => actions.toggleItem(folder, item),
        })),
      ),
      { label: "New folder…", onSelect: () => actions.addToNewFolder(item) },
    ],
  }
}
