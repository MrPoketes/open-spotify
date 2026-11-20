import { Check } from "lucide-react"
import { type KeyboardEvent, use, useState } from "react"
import { type ThemeId, builtInThemes, themeIds } from "../../../shared/built-in-themes"
import type { Theme } from "../../../shared/theme"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { type RovingRowProps, useRovingFocus } from "../../ui/use-roving-focus"
import { selectTheme } from "./saved-theme"
import { ThemeSwatch } from "./theme-swatch"
import { useThemePreview } from "./use-theme-preview"

export function ThemePicker({ savedThemeId }: { readonly savedThemeId: ThemeId }) {
  const runtime = use(RendererRuntimeContext)
  const [chosenThemeId, setChosenThemeId] = useState(savedThemeId)
  const { setHoveredThemeId, setFocusedThemeId } = useThemePreview(chosenThemeId)
  // Tab enters the list on the saved theme.
  const { onKeyDown, rowProps } = useRovingFocus(themeIds.length, themeIds.indexOf(savedThemeId))

  const chooseTheme = (themeId: ThemeId) => {
    setChosenThemeId(themeId)
    runtime.runFork(selectTheme(themeId))
  }

  return (
    // The rows touch, so the pointer never crosses a gap that would flash the
    // saved theme between two previews.
    <ul aria-label="Theme" className="flex flex-col">
      {themeIds.map((themeId, index) => (
        <li key={themeId}>
          <ThemeOption
            theme={builtInThemes[themeId]}
            isChosen={themeId === chosenThemeId}
            rovingProps={rowProps(index)}
            onKeyDown={onKeyDown}
            onHover={() => setHoveredThemeId(themeId)}
            onUnhover={() => setHoveredThemeId(null)}
            onFocus={() => setFocusedThemeId(themeId)}
            onBlur={() => setFocusedThemeId(null)}
            onChoose={() => chooseTheme(themeId)}
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
