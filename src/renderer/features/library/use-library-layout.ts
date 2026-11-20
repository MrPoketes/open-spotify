import type { LibraryEntryKind, LibrarySection } from "../../../shared/library-layout"
import { useSavedSettingState } from "../../lib/use-saved-setting-state"
import type { MenuAction } from "../../ui/menu-button"
import type { LibraryEntry } from "./library-entries"
import { sectionFocusKey, showSectionFocusKey, useFocusAfterChange } from "./use-focus-after-change"

export interface SavedLibraryLayout {
  readonly pinnedUris: ReadonlyArray<string>
  readonly sections: ReadonlyArray<LibrarySection>
}

export interface SectionNeighbours {
  readonly previous: LibrarySection | undefined
  readonly next: LibrarySection | undefined
}

const changeSection = (
  sections: ReadonlyArray<LibrarySection>,
  kind: LibraryEntryKind,
  change: Partial<LibrarySection>,
) => sections.map((section) => (section.kind === kind ? { ...section, ...change } : section))

const swapSections = (
  sections: ReadonlyArray<LibrarySection>,
  first: LibrarySection,
  second: LibrarySection,
) =>
  sections.map((section) => {
    if (section.kind === first.kind) return second
    if (section.kind === second.kind) return first
    return section
  })

export const useLibraryLayout = (saved: SavedLibraryLayout) => {
  const [pinnedUris, changePinnedUris] = useSavedSettingState(
    "pinnedLibraryEntries",
    saved.pinnedUris,
  )
  const [sections, changeSections] = useSavedSettingState("librarySections", saved.sections)
  const { focusAfterChange, moveFocusAfterChange } = useFocusAfterChange()

  // An unpinned entry goes back to its section, which may be collapsed.
  const togglePin = ({ uri, kind }: LibraryEntry) => {
    moveFocusAfterChange([uri, sectionFocusKey(kind)])
    const isPinned = pinnedUris.includes(uri)
    changePinnedUris(
      isPinned ? pinnedUris.filter((pinnedUri) => pinnedUri !== uri) : [...pinnedUris, uri],
    )
  }

  const toggleCollapsed = (section: LibrarySection) =>
    changeSections(changeSection(sections, section.kind, { collapsed: !section.collapsed }))

  const showSection = (kind: LibraryEntryKind) => {
    moveFocusAfterChange([sectionFocusKey(kind)])
    changeSections(changeSection(sections, kind, { hidden: false }))
  }

  // Neighbours are the sections on screen, so a move never seems to do
  // nothing because it passed a hidden or empty section.
  const sectionMenuActions = (
    section: LibrarySection,
    { previous, next }: SectionNeighbours,
  ): ReadonlyArray<MenuAction> => {
    const moveTo = (neighbour: LibrarySection) => () => {
      moveFocusAfterChange([sectionFocusKey(section.kind)])
      changeSections(swapSections(sections, section, neighbour))
    }
    const hide = () => {
      moveFocusAfterChange([showSectionFocusKey(section.kind)])
      changeSections(changeSection(sections, section.kind, { hidden: true }))
    }
    return [
      ...(previous === undefined ? [] : [{ label: "Move up", onSelect: moveTo(previous) }]),
      ...(next === undefined ? [] : [{ label: "Move down", onSelect: moveTo(next) }]),
      { label: "Hide section", onSelect: hide },
    ]
  }

  return {
    pinnedUris,
    sections,
    focusAfterChange,
    togglePin,
    toggleCollapsed,
    showSection,
    sectionMenuActions,
  }
}
