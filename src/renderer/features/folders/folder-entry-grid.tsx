import type { FolderEntry } from "../../../shared/folders"
import { CardGrid, type GridCard } from "../../ui/card-grid"
import { describeFolderEntry } from "./folder-entry-description"

const folderEntryCard = (entry: FolderEntry): GridCard => {
  const { key, name, details, artwork, icon, isArtist, page } = describeFolderEntry(entry)
  return {
    key,
    link: page,
    title: name,
    details,
    artwork,
    placeholderIcon: icon,
    roundArtwork: isArtist,
  }
}

export function FolderEntryGrid({ entries }: { readonly entries: ReadonlyArray<FolderEntry> }) {
  return <CardGrid label="Folder contents" cards={entries.map(folderEntryCard)} />
}
