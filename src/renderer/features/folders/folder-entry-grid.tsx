import { useState } from "react"
import type { FolderEntry } from "../../../shared/folders"
import { useRovingFocus } from "../../ui/use-roving-focus"
import { type FolderEntryDescription, describeFolderEntry } from "./folder-entry-description"
import { FolderEntryTarget } from "./folder-entry-target"

function FolderEntryArtwork({ description }: { readonly description: FolderEntryDescription }) {
  const [failedToLoad, setFailedToLoad] = useState(false)
  const { imageUrl, icon: PlaceholderIcon, isArtist } = description
  const shape = isArtist ? "rounded-full" : "rounded-medium"

  if (imageUrl === null || failedToLoad) {
    return (
      <span
        className={`flex aspect-square w-full items-center justify-center bg-surface-raised text-muted ${shape}`}
      >
        <PlaceholderIcon aria-hidden size={48} />
      </span>
    )
  }
  return (
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      onError={() => setFailedToLoad(true)}
      className={`aspect-square w-full object-cover ${shape}`}
    />
  )
}

export function FolderEntryGrid({ entries }: { readonly entries: ReadonlyArray<FolderEntry> }) {
  const { onKeyDown, rowProps } = useRovingFocus(entries.length)
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused card, and the grid moves focus between its cards: the roving focus docs/design.md requires for lists
    <ul
      onKeyDown={onKeyDown}
      aria-label="Folder contents"
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6"
    >
      {entries.map((entry, index) => {
        const description = describeFolderEntry(entry)
        return (
          <li key={description.key}>
            <FolderEntryTarget
              page={description.page}
              rovingProps={rowProps(index)}
              className="flex flex-col gap-2 rounded-medium p-3"
              hoverClassName="hover:bg-surface-raised hover:shadow-raised"
            >
              <FolderEntryArtwork description={description} />
              <span className="truncate text-sm font-semibold">{description.name}</span>
              <span className="truncate text-xs text-muted">{description.details}</span>
            </FolderEntryTarget>
          </li>
        )
      })}
    </ul>
  )
}
