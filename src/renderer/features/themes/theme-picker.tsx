import { Check } from "lucide-react"
import { type KeyboardEvent, use } from "react"
import type { Theme } from "../../../shared/theme"
import { type LibraryTheme, type ThemeId, findLibraryTheme } from "../../../shared/theme-library"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { type RovingRowProps, useRovingFocus } from "../../ui/use-roving-focus"
import { selectTheme } from "./saved-theme"
import { ThemeSwatch } from "./theme-swatch"
import { useThemePreview } from "./use-theme-preview"

interface ThemePickerProps {
  readonly themes: ReadonlyArray<LibraryTheme>
  readonly chosenThemeId: ThemeId
  // The picker applies and saves a chosen theme itself.
  readonly onChoose: (themeId: ThemeId) => void
}

export function ThemePicker({ themes, chosenThemeId, onChoose }: ThemePickerProps) {
  const runtime = use(RendererRuntimeContext)
  const { setHoveredTheme, setFocusedTheme } = useThemePreview(
    findLibraryTheme(themes, chosenThemeId).theme,
  )
  // Tab enters the list on the chosen theme.
  const { onKeyDown, rowProps } = useRovingFocus(
    themes.length,
    themes.findIndex((libraryTheme) => libraryTheme.id === chosenThemeId),
  )

  const chooseTheme = (libraryTheme: LibraryTheme) => {
    onChoose(libraryTheme.id)
    runtime.runFork(selectTheme(libraryTheme))
  }

  return (
    // The rows touch, so the pointer never crosses a gap that would flash the
    // saved theme between two previews.
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
          />
        </li>
      ))}
    </ul>
  )
}

interface ThemeOptionProps {
  readonly theme: Theme
  readonly isChosen: boolean
  readonly rovingProps: RovingRowProps
  readonly onKeyDown: (event: KeyboardEvent) => void
  readonly onHover: () => void
  readonly onUnhover: () => void
  readonly onFocus: () => void
  readonly onBlur: () => void
  readonly onChoose: () => void
}

function ThemeOption(props: ThemeOptionProps) {
  const { theme, isChosen, rovingProps, onKeyDown, onHover, onUnhover, onFocus, onBlur, onChoose } =
    props
  const chosenStyle = isChosen ? "bg-accent/15 font-semibold" : "hover:bg-surface-raised"

  return (
    <button
      type="button"
      {...rovingProps}
      aria-pressed={isChosen}
      aria-label={`${theme.name} by ${theme.author}`}
      onKeyDown={onKeyDown}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      onFocus={() => {
        rovingProps.onFocus()
        onFocus()
      }}
      onBlur={onBlur}
      onClick={onChoose}
      className={`flex w-full items-center gap-3 rounded-small p-3 text-left text-sm transition-colors duration-120 ease-out ${chosenStyle}`}
    >
      <ThemeSwatch theme={theme} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{theme.name}</span>
        <span className="truncate text-xs font-normal text-muted">by {theme.author}</span>
      </span>
      {isChosen && <Check aria-hidden size={16} />}
    </button>
  )
}
