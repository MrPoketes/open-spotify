import type { LibraryEntryKind, LibrarySection } from "../../../shared/library-layout"
import { librarySectionNames } from "./library-section-names"
import { showSectionFocusKey, type FocusAfterChange } from "./use-focus-after-change"

interface HiddenLibrarySectionsProps {
  readonly sections: ReadonlyArray<LibrarySection>
  readonly onShow: (kind: LibraryEntryKind) => void
  readonly focusAfterChange: FocusAfterChange
}

export function HiddenLibrarySections({
  sections,
  onShow,
  focusAfterChange,
}: HiddenLibrarySectionsProps) {
  const hiddenSections = sections.filter((section) => section.hidden)
  if (hiddenSections.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-2 pt-4">
      <span className="text-xs text-muted">Hidden sections:</span>
      {hiddenSections.map(({ kind }) => (
        <button
          key={kind}
          ref={focusAfterChange(showSectionFocusKey(kind))}
          type="button"
          onClick={() => onShow(kind)}
          className="rounded-full bg-surface-raised px-3 py-1 text-sm transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75"
        >
          Show {librarySectionNames[kind]}
        </button>
      ))}
    </div>
  )
}
