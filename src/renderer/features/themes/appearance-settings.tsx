import { useEffect, useRef, useState } from "react"
import type { Theme } from "../../../shared/theme"
import { type LibraryTheme, findLibraryTheme } from "../../../shared/theme-library"
import type { SavedThemeLibrary } from "./saved-theme"
import { ThemeEditor } from "./theme-editor"
import { ThemeFileButtons } from "./theme-file-buttons"
import { ThemePicker } from "./theme-picker"

// The main process keeps imported themes in import order and a replaced theme
// in its place, so the list here matches the next one it reads.
const withImportedTheme = (
  themes: ReadonlyArray<LibraryTheme>,
  importedTheme: LibraryTheme,
): ReadonlyArray<LibraryTheme> => {
  if (!themes.some((libraryTheme) => libraryTheme.id === importedTheme.id)) {
    return [...themes, importedTheme]
  }
  return themes.map((libraryTheme) =>
    libraryTheme.id === importedTheme.id ? importedTheme : libraryTheme,
  )
}

// The editor takes the picker's place, so a hovered row cannot preview over
// the theme being edited. The picker saves a theme as soon as it is chosen,
// so the chosen theme is the saved one the editor copies and restores.
export function AppearanceSettings({ library }: { readonly library: SavedThemeLibrary }) {
  const [themes, setThemes] = useState(library.themes)
  const [chosenThemeId, setChosenThemeId] = useState(library.savedTheme.id)
  const [themeToEdit, setThemeToEdit] = useState<Theme | null>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)

  // The editor's buttons disappear with it, so focus returns to the button
  // that opened it.
  useEffect(() => {
    if (themeToEdit === null && wasEditing.current) {
      editButton.current?.focus()
    }
    wasEditing.current = themeToEdit !== null
  }, [themeToEdit])

  const addTheme = (libraryTheme: LibraryTheme) =>
    setThemes((currentThemes) => withImportedTheme(currentThemes, libraryTheme))

  if (themeToEdit !== null) {
    return (
      <ThemeEditor
        savedTheme={themeToEdit}
        onSave={(savedTheme) => {
          addTheme(savedTheme)
          setChosenThemeId(savedTheme.id)
          setThemeToEdit(null)
        }}
        onCancel={() => setThemeToEdit(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ThemePicker themes={themes} chosenThemeId={chosenThemeId} onChoose={setChosenThemeId} />
      <button
        ref={editButton}
        type="button"
        onClick={() => setThemeToEdit(findLibraryTheme(themes, chosenThemeId).theme)}
        className="self-start rounded-full bg-surface-raised px-4 py-2 text-sm font-semibold"
      >
        Edit a copy
      </button>
      <ThemeFileButtons onImport={addTheme} />
    </div>
  )
}
