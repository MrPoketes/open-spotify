import { ChevronDown, ChevronRight, Ellipsis } from "lucide-react"
import { useId } from "react"
import type { LibrarySection } from "../../../shared/library-layout"
import { MenuButton } from "../../ui/menu-button"
import type { MenuAction } from "../../ui/menu-items"
import type { LibraryEntry } from "./library-entries"
import { LibraryEntryList } from "./library-entry-list"
import type { LibraryEntryActions } from "./library-entry-row"
import { librarySectionNames } from "./library-section-names"
import { sectionFocusKey } from "./use-focus-after-change"

interface LibrarySectionGroupProps {
  readonly section: LibrarySection
  readonly entries: ReadonlyArray<LibraryEntry>
  readonly menuActions: ReadonlyArray<MenuAction>
  readonly onToggleCollapsed: () => void
  readonly entryActions: LibraryEntryActions
}

export function LibrarySectionGroup({
  section,
  entries,
  menuActions,
  onToggleCollapsed,
  entryActions,
}: LibrarySectionGroupProps) {
  const listId = useId()
  const name = librarySectionNames[section.kind]
  const ChevronIcon = section.collapsed ? ChevronRight : ChevronDown

  return (
    <section aria-label={name} className="flex flex-col pt-2">
      <div className="flex items-center justify-between gap-2 pl-2">
        <h3>
          <button
            ref={entryActions.focusAfterChange(sectionFocusKey(section.kind))}
            type="button"
            aria-expanded={!section.collapsed}
            aria-controls={section.collapsed ? undefined : listId}
            onClick={onToggleCollapsed}
            className="flex items-center gap-1 rounded-small py-1 text-sm font-semibold text-muted transition-colors duration-120 ease-out hover:text-foreground"
          >
            <ChevronIcon aria-hidden size={16} />
            {name}
          </button>
        </h3>
        <MenuButton label={`${name} section options`} icon={Ellipsis} items={menuActions} />
      </div>
      {!section.collapsed && (
        <LibraryEntryList id={listId} entries={entries} pinned={false} actions={entryActions} />
      )}
    </section>
  )
}

interface PinnedLibrarySectionProps {
  readonly entries: ReadonlyArray<LibraryEntry>
  readonly entryActions: LibraryEntryActions
}

export function PinnedLibrarySection({ entries, entryActions }: PinnedLibrarySectionProps) {
  return (
    <section aria-label="Pinned" className="flex flex-col pt-2">
      <h3 className="py-1 pl-2 text-sm font-semibold text-muted">Pinned</h3>
      <LibraryEntryList entries={entries} pinned actions={entryActions} />
    </section>
  )
}
