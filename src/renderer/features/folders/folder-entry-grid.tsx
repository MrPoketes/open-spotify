import type { FolderEntry } from "../../../shared/folders"
import { CardGrid, type GridCard } from "../../ui/card-grid"
import { describeFolderEntry } from "./folder-entry-description"
import { useWithFolderMenu } from "./use-with-folder-menu"

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
  const withFolderMenu = useWithFolderMenu()
  // A folder is not a Spotify item, so Add to folder cannot hold it.
  const cards = entries.map((entry) =>
    entry._tag === "Folder"
      ? folderEntryCard(entry)
      : withFolderMenu(folderEntryCard(entry), entry.uri),
  )
  return <CardGrid label="Folder contents" cards={cards} />
}
