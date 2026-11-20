import { useState } from "react"
import type { LibraryTheme } from "../../../shared/theme-library"
import type { SavedThemeLibrary } from "./saved-theme"
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

export function AppearanceSettings({ library }: { readonly library: SavedThemeLibrary }) {
  const [themes, setThemes] = useState(library.themes)

  return (
    <div className="flex flex-col gap-4">
      <ThemePicker themes={themes} savedThemeId={library.savedTheme.id} />
      <ThemeFileButtons
        onImport={(importedTheme) =>
          setThemes((currentThemes) => withImportedTheme(currentThemes, importedTheme))
        }
      />
    </div>
  )
}
