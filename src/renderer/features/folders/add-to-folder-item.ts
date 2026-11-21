import type { Folder, SpotifyItem } from "../../../shared/folders"
import type { MenuItem } from "../../ui/menu-list"
import type { SharedFolderTree } from "./folder-tree"

export interface AddToFolderActions {
  readonly toggleItem: (folder: Folder, item: SpotifyItem) => void
  readonly addToNewFolder: (item: SpotifyItem) => void
  readonly explainMissingFolders: () => void
}

export const holdsItem = (folder: Folder, uri: string) =>
  folder.entries.some((entry) => entry._tag === "SpotifyItem" && entry.uri === uri)

// A folder with folders inside opens a submenu, which starts with the folder
// itself so the item can still go straight into it.
const folderMenuItem = (
  folder: Folder,
  item: SpotifyItem,
  actions: AddToFolderActions,
): MenuItem => {
  const folderChoice = {
    id: folder.id,
    label: folder.name,
    checked: holdsItem(folder, item.uri),
    onSelect: () => actions.toggleItem(folder, item),
  }
  const childFolders = folder.entries.filter((entry) => entry._tag === "Folder")
  if (childFolders.length === 0) {
    return folderChoice
  }
  return {
    id: folder.id,
    label: folder.name,
    items: [folderChoice, ...childFolders.map((child) => folderMenuItem(child, item, actions))],
  }
}

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
      ...folderTree.value.map((folder) => folderMenuItem(folder, item, actions)),
      { label: "New folder…", onSelect: () => actions.addToNewFolder(item) },
    ],
  }
}
