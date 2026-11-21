import { Link } from "@tanstack/react-router"
import type { FolderEntry } from "../../../shared/folders"
import { RovingList } from "../../ui/roving-list"
import { useContextMenu } from "../../ui/use-context-menu"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import { describeFolderEntry } from "./folder-entry-description"
import { useAddToFolder } from "./use-add-to-folder"

// Dense rows without artwork, so a large folder can be scanned at a glance.
export function FolderEntryList({ entries }: { readonly entries: ReadonlyArray<FolderEntry> }) {
  return (
    <RovingList
      label="Folder contents"
      rows={entries}
      rowKey={(entry) => describeFolderEntry(entry).key}
      className="flex flex-col"
      renderRow={(entry, rovingProps) => <FolderEntryRow entry={entry} rovingProps={rovingProps} />}
    />
  )
}

interface FolderEntryRowProps {
  readonly entry: FolderEntry
  readonly rovingProps: RovingRowProps
}

function FolderEntryRow({ entry, rovingProps }: FolderEntryRowProps) {
  const { name, details, artwork, icon: Icon, page } = describeFolderEntry(entry)
  const addToFolder = useAddToFolder()
  // A folder is not a Spotify item, so Add to folder cannot hold it.
  const entryMenu = useContextMenu(
    entry._tag === "Folder"
      ? null
      : {
          label: `Actions for ${name}`,
          items: [addToFolder({ uri: entry.uri, name, images: artwork })],
        },
  )

  return (
    <>
      <Link
        {...page}
        {...rovingProps}
        onContextMenu={entryMenu.openAtPointer}
        onKeyDown={entryMenu.openWithKeyboard}
        className="flex h-8 items-center gap-3 rounded-small px-3 transition duration-120 ease-out hover:bg-surface-raised"
      >
        <Icon aria-hidden size={16} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
        <span className="shrink-0 text-xs text-muted">{details}</span>
      </Link>
      {entryMenu.menu}
    </>
  )
}
