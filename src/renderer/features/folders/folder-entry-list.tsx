import type { FolderEntry } from "../../../shared/folders"
import { useRovingFocus } from "../../ui/use-roving-focus"
import { describeFolderEntry } from "./folder-entry-description"
import { FolderEntryTarget } from "./folder-entry-target"

// Dense rows without artwork, so a large folder can be scanned at a glance.
export function FolderEntryList({ entries }: { readonly entries: ReadonlyArray<FolderEntry> }) {
  const { onKeyDown, rowProps } = useRovingFocus(entries.length)
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused entry, and the list moves focus between its entries: the roving focus docs/design.md requires for lists
    <ul onKeyDown={onKeyDown} aria-label="Folder contents" className="flex flex-col">
      {entries.map((entry, index) => {
        const { key, name, details, icon: Icon, page } = describeFolderEntry(entry)
        return (
          <li key={key}>
            <FolderEntryTarget
              page={page}
              rovingProps={rowProps(index)}
              className="flex h-8 items-center gap-3 rounded-small px-3"
              hoverClassName="hover:bg-surface-raised"
            >
              <Icon aria-hidden size={16} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <span className="shrink-0 text-xs text-muted">{details}</span>
            </FolderEntryTarget>
          </li>
        )
      })}
    </ul>
  )
}
