import { useEffect, useRef } from "react"
import type { LibraryEntryKind, LibrarySection } from "../../../shared/library-layout"
import { useSavedSettingState } from "../../lib/use-saved-setting-state"
import type { MenuAction } from "../../ui/menu-button"

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

// Focus keys name the control that should hold focus after a change moves or
// removes the one that had it. An entry's row uses its URI.
export const sectionFocusKey = (kind: LibraryEntryKind) => `section:${kind}`
export const showSectionFocusKey = (kind: LibraryEntryKind) => `show:${kind}`

export const useLibraryLayout = (saved: SavedLibraryLayout) => {
  const [pinnedUris, changePinnedUris] = useSavedSettingState(
    "pinnedLibraryEntries",
    saved.pinnedUris,
  )
  const [sections, changeSections] = useSavedSettingState("librarySections", saved.sections)
  const pendingFocusKey = useRef<string | null>(null)
  // Cleared after every render, so a control that only appears later, such as
  // a row in a section the user expands, does not take focus.
  useEffect(() => {
    pendingFocusKey.current = null
  })

  const focusAfterChange = (focusKey: string) => (element: HTMLElement | null) => {
    if (element !== null && pendingFocusKey.current === focusKey) element.focus()
  }

  const changeSectionsAndFocus = (
    nextSections: ReadonlyArray<LibrarySection>,
    focusKey: string,
  ) => {
    pendingFocusKey.current = focusKey
    changeSections(nextSections)
  }

  const togglePin = (uri: string) => {
    pendingFocusKey.current = uri
    const isPinned = pinnedUris.includes(uri)
    changePinnedUris(
      isPinned ? pinnedUris.filter((pinnedUri) => pinnedUri !== uri) : [...pinnedUris, uri],
    )
  }

  const toggleCollapsed = (section: LibrarySection) =>
    changeSections(changeSection(sections, section.kind, { collapsed: !section.collapsed }))

  const showSection = (kind: LibraryEntryKind) =>
    changeSectionsAndFocus(changeSection(sections, kind, { hidden: false }), sectionFocusKey(kind))

  // Neighbours are the sections on screen, so a move never seems to do
  // nothing because it passed a hidden or empty section.
  const sectionMenuActions = (
    section: LibrarySection,
    { previous, next }: SectionNeighbours,
  ): ReadonlyArray<MenuAction> => {
    const moveTo = (neighbour: LibrarySection) => () =>
      changeSectionsAndFocus(
        swapSections(sections, section, neighbour),
        sectionFocusKey(section.kind),
      )
    return [
      ...(previous === undefined ? [] : [{ label: "Move up", onSelect: moveTo(previous) }]),
      ...(next === undefined ? [] : [{ label: "Move down", onSelect: moveTo(next) }]),
      {
        label: "Hide section",
        onSelect: () =>
          changeSectionsAndFocus(
            changeSection(sections, section.kind, { hidden: true }),
            showSectionFocusKey(section.kind),
          ),
      },
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
