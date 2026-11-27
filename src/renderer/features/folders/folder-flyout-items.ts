import type { Folder } from "../../../shared/folders"
import type { MenuItem } from "../../ui/menu-items"
import { describeFolderEntry, type FolderEntryPage } from "./folder-entry-description"

// A folder's contents as menu items, for the sidebar's icon rail: the folder's
// own page first, then each entry's page, with a submenu for each folder
// inside it, nested as deep as the tree goes.
export const folderFlyoutItems = (
  folder: Folder,
  openPage: (page: FolderEntryPage) => void,
): ReadonlyArray<MenuItem> => [
  { label: `Open ${folder.name}`, onSelect: () => openPage(describeFolderEntry(folder).page) },
  ...folder.entries.map((entry): MenuItem => {
    const { key, name, page } = describeFolderEntry(entry)
    if (entry._tag === "Folder") {
      return { id: key, label: name, items: folderFlyoutItems(entry, openPage) }
    }
    return { id: key, label: name, onSelect: () => openPage(page) }
  }),
]
