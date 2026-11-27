import { Eye } from "lucide-react"
import type { LibraryEntryKind, LibrarySection } from "../../../shared/library-layout"
import { Button } from "../../ui/button"
import { sectionLabelClassName } from "../../ui/section-label-class-name"
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
    <div className="flex flex-col pt-4">
      <h3 className={`flex h-8 items-center px-2 ${sectionLabelClassName}`}>Hidden</h3>
      <div className="flex flex-wrap gap-1">
        {hiddenSections.map(({ kind }) => (
          <Button
            key={kind}
            ref={focusAfterChange(showSectionFocusKey(kind))}
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => onShow(kind)}
          >
            <Eye aria-hidden size={14} />
            Show {librarySectionNames[kind]}
          </Button>
        ))}
      </div>
    </div>
  )
}
