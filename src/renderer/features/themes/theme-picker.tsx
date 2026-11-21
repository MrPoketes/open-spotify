import { use, useEffect, useRef } from "react"
import {
  type LibraryTheme,
  type ThemeId,
  defaultLibraryTheme,
  findLibraryTheme,
  isBuiltInTheme,
} from "../../../shared/theme-library"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { useRovingFocus } from "../../ui/use-roving-focus"
import { selectTheme } from "./saved-theme"
import { type DeleteTrigger, ThemeOption } from "./theme-option"
import { useDeleteImportedTheme } from "./use-delete-imported-theme"
import { useThemePreview } from "./use-theme-preview"

interface ThemePickerProps {
  readonly themes: ReadonlyArray<LibraryTheme>
  readonly chosenThemeId: ThemeId
  // The picker applies and saves a chosen theme itself, and deletes a theme
  // from storage before it reports the deletion.
  readonly onChoose: (themeId: ThemeId) => void
  readonly onDelete: (themeId: ThemeId) => void
}

export function ThemePicker({ themes, chosenThemeId, onChoose, onDelete }: ThemePickerProps) {
  const runtime = use(RendererRuntimeContext)
  const { setHoveredTheme, setFocusedTheme } = useThemePreview(
    findLibraryTheme(themes, chosenThemeId).theme,
  )
  // Tab enters the list on the chosen theme.
  const { onKeyDown, rowProps, focusRow } = useRovingFocus(
    themes.length,
    themes.findIndex((libraryTheme) => libraryTheme.id === chosenThemeId),
  )
  // A row deleted from the keyboard hands focus to the row that takes its
  // place, so the user can carry on without tabbing back into the list.
  const focusAfterDelete = useRef<{ themeId: ThemeId; index: number } | null>(null)

  useEffect(() => {
    const pendingFocus = focusAfterDelete.current
    if (pendingFocus === null || themes.some(({ id }) => id === pendingFocus.themeId)) {
      return
    }
    focusAfterDelete.current = null
    focusRow(pendingFocus.index)
  }, [themes, focusRow])

  const chooseTheme = (libraryTheme: LibraryTheme) => {
    onChoose(libraryTheme.id)
    runtime.runFork(selectTheme(libraryTheme))
  }

  const { deleteImportedTheme, failureMessage } = useDeleteImportedTheme((libraryTheme) => {
    // The deleted row's pointer and focus events never arrive, so its preview
    // is cleared here.
    setHoveredTheme(null)
    setFocusedTheme(null)
    onDelete(libraryTheme.id)
    if (libraryTheme.id === chosenThemeId) {
      chooseTheme(defaultLibraryTheme)
    }
  })

  // A pointer delete leaves focus alone: a focused neighbour would keep
  // previewing its theme after the pointer leaves the picker.
  const deleteRow = (libraryTheme: LibraryTheme, index: number, trigger: DeleteTrigger) => {
    focusAfterDelete.current = trigger === "keyboard" ? { themeId: libraryTheme.id, index } : null
    deleteImportedTheme(libraryTheme)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The rows touch, so the pointer never crosses a gap that would flash
          the saved theme between two previews. */}
      <ul aria-label="Theme" className="flex flex-col">
        {themes.map((libraryTheme, index) => (
          <li key={libraryTheme.id}>
            <ThemeOption
              theme={libraryTheme.theme}
              isChosen={libraryTheme.id === chosenThemeId}
              rovingProps={rowProps(index)}
              onKeyDown={onKeyDown}
              onHover={() => setHoveredTheme(libraryTheme.theme)}
              onUnhover={() => setHoveredTheme(null)}
              onFocus={() => setFocusedTheme(libraryTheme.theme)}
              onBlur={() => setFocusedTheme(null)}
              onChoose={() => chooseTheme(libraryTheme)}
              onDelete={
                isBuiltInTheme(libraryTheme.id)
                  ? null
                  : (trigger) => deleteRow(libraryTheme, index, trigger)
              }
            />
          </li>
        ))}
      </ul>
      {failureMessage !== null && (
        <p role="alert" className="text-sm text-danger">
          {failureMessage}
        </p>
      )}
    </div>
  )
}
