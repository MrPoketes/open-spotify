import { ChevronDown, ChevronRight, Ellipsis } from "lucide-react"
import { useId } from "react"
import type { LibrarySection } from "../../../shared/library-layout"
import { MenuButton } from "../../ui/menu-button"
import type { MenuAction } from "../../ui/menu-items"
import { shownOnRowHoverClassName } from "../../ui/row-action-class-name"
import { sidebarHeadingClassNames } from "../../ui/sidebar-heading-class-names"
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
      <div className={`group ${sidebarHeadingClassNames.row}`}>
        <h3>
          <button
            ref={entryActions.focusAfterChange(sectionFocusKey(section.kind))}
            type="button"
            aria-expanded={!section.collapsed}
            aria-controls={section.collapsed ? undefined : listId}
            onClick={onToggleCollapsed}
            className={`flex items-center gap-1 rounded-small py-1 transition-colors duration-120 ease-out hover:text-foreground ${sidebarHeadingClassNames.label}`}
          >
            {name}
            <ChevronIcon aria-hidden size={14} />
          </button>
        </h3>
        {/* An open menu keeps its button shown while focus is in the menu. */}
        <span className={`${shownOnRowHoverClassName} has-aria-expanded:opacity-100`}>
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
      <h3 className={`${sidebarHeadingClassNames.row} ${sidebarHeadingClassNames.label}`}>
        Pinned
      </h3>
      <LibraryEntryList entries={entries} pinned actions={entryActions} />
    </section>
  )
}
