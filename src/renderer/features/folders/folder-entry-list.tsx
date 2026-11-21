import { Link } from "@tanstack/react-router"
import type { FolderEntry } from "../../../shared/folders"
import { RovingList } from "../../ui/roving-list"
import { describeFolderEntry } from "./folder-entry-description"

// Dense rows without artwork, so a large folder can be scanned at a glance.
export function FolderEntryList({ entries }: { readonly entries: ReadonlyArray<FolderEntry> }) {
  return (
    <RovingList
      label="Folder contents"
      rows={entries.map(describeFolderEntry)}
      rowKey={(description) => description.key}
      className="flex flex-col"
      renderRow={({ name, details, icon: Icon, page }, rovingProps) => (
        <Link
          {...page}
          {...rovingProps}
          className="flex h-8 items-center gap-3 rounded-small px-3 transition duration-120 ease-out hover:bg-surface-raised"
        >
          <Icon aria-hidden size={16} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
          <span className="shrink-0 text-xs text-muted">{details}</span>
        </Link>
      )}
    />
  )
}
