import type { FolderEntry } from "../../../shared/folders"
import { CardGrid, type GridCard } from "../../ui/card-grid"
import { describeFolderEntry } from "./folder-entry-description"

const folderEntryCard = (entry: FolderEntry): GridCard => {
  const { key, name, details, imageUrl, icon, isArtist, page } = describeFolderEntry(entry)
  return {
    key,
    link: page,
    title: name,
    details,
    // The folder tree caches one image per item, without its width.
    artwork: imageUrl === null ? [] : [{ url: imageUrl, width: null }],
    placeholderIcon: icon,
    roundArtwork: isArtist,
  }
}

export function FolderEntryGrid({ entries }: { readonly entries: ReadonlyArray<FolderEntry> }) {
  return <CardGrid label="Folder contents" cards={entries.map(folderEntryCard)} />
}
