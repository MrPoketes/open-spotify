import type { Folder } from "../../../shared/folders"
import type { MenuAction, MenuItem } from "../../ui/menu-items"

// A folder with folders inside opens a submenu, which starts with the folder
// itself so it can still be chosen. A folder that cannot be chosen, and holds
// no folder that can, is left out.
export const folderMenuItems = (
  folder: Folder,
  choiceFor: (folder: Folder) => MenuAction | undefined,
): ReadonlyArray<MenuItem> => {
  const choice = choiceFor(folder)
  const choices = choice === undefined ? [] : [choice]
  const childFolderItems = folder.entries.flatMap((entry) =>
    entry._tag === "Folder" ? folderMenuItems(entry, choiceFor) : [],
  )
  if (childFolderItems.length === 0) {
    return choices
  }
  return [{ id: folder.id, label: folder.name, items: [...choices, ...childFolderItems] }]
}
