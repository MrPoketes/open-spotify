import { ChevronDown, ChevronRight, Ellipsis } from "lucide-react"
import { useId } from "react"
import type { LibrarySection } from "../../../shared/library-layout"
import { MenuButton } from "../../ui/menu-button"
import type { MenuAction } from "../../ui/menu-items"
import { shownOnRowHoverClassName } from "../../ui/row-action-class-name"
import { sectionLabelClassName } from "../../ui/section-label-class-name"
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
    <section aria-label={name} className="flex flex-col pt-4">
      <div className="group flex h-8 items-center justify-between gap-2 pr-2 pl-2">
        <h3>
          <button
            ref={entryActions.focusAfterChange(sectionFocusKey(section.kind))}
            type="button"
            aria-expanded={!section.collapsed}
            aria-controls={section.collapsed ? undefined : listId}
            onClick={onToggleCollapsed}
            className={`flex items-center gap-1 rounded-small py-1 transition-colors duration-120 ease-out hover:text-foreground ${sectionLabelClassName}`}
          >
            {name}
            <ChevronIcon aria-hidden size={14} />
          </button>
        </h3>
        <span className={shownOnRowHoverClassName}>
          <MenuButton label={`${name} section options`} icon={Ellipsis} items={menuActions} />
        </span>
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
    <section aria-label="Pinned" className="flex flex-col pt-4">
      <h3 className={`flex h-8 items-center px-2 ${sectionLabelClassName}`}>Pinned</h3>
      <LibraryEntryList entries={entries} pinned actions={entryActions} />
    </section>
  )
}
