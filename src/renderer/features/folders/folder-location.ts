import type { Folder, FolderEntry, FolderTree } from "../../../shared/folders"

export interface FolderLocation {
  readonly folder: Folder
  // From the top level down to the folder's parent.
  readonly ancestors: ReadonlyArray<Folder>
}

export const locateFolder = (tree: FolderTree, folderId: string): FolderLocation | undefined => {
  const searchEntries = (
    entries: ReadonlyArray<FolderEntry>,
    ancestors: ReadonlyArray<Folder>,
  ): FolderLocation | undefined => {
    for (const entry of entries) {
      if (entry._tag === "SpotifyItem") {
        continue
      }
      if (entry.id === folderId) {
        return { folder: entry, ancestors }
      }
      const location = searchEntries(entry.entries, [...ancestors, entry])
      if (location !== undefined) {
        return location
      }
    }
    return undefined
  }
  return searchEntries(tree, [])
}
