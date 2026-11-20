import { Check } from "lucide-react"
import { type KeyboardEvent, use, useRef, useState } from "react"
import { type ThemeId, builtInThemes, themeIds } from "../../../shared/built-in-themes"
import type { Theme } from "../../../shared/theme"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { selectTheme } from "./saved-theme"
import { ThemeSwatch } from "./theme-swatch"
import { useThemePreview } from "./use-theme-preview"

const focusStepForKey: Partial<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }

export function ThemePicker({ savedThemeId }: { readonly savedThemeId: ThemeId }) {
  const runtime = use(RendererRuntimeContext)
  const [chosenThemeId, setChosenThemeId] = useState(savedThemeId)
  const { setHoveredThemeId, setFocusedThemeId } = useThemePreview(chosenThemeId)
  const optionButtons = useRef<Array<HTMLButtonElement | null>>([])

  const chooseTheme = (themeId: ThemeId) => {
    setChosenThemeId(themeId)
    runtime.runFork(selectTheme(themeId))
  }

  const moveFocus = (event: KeyboardEvent, fromIndex: number) => {
    const step = focusStepForKey[event.key]
    if (step === undefined) {
      return
    }
    event.preventDefault()
    optionButtons.current[fromIndex + step]?.focus()
  }

  return (
    // The rows touch, so the pointer never crosses a gap that would flash the
    // saved theme between two previews.
    <ul aria-label="Theme" className="flex flex-col">
      {themeIds.map((themeId, index) => (
        <li key={themeId}>
          <ThemeOption
            ref={(button) => {
              optionButtons.current[index] = button
            }}
            theme={builtInThemes[themeId]}
            isChosen={themeId === chosenThemeId}
            onHover={() => setHoveredThemeId(themeId)}
            onUnhover={() => setHoveredThemeId(null)}
            onFocus={() => setFocusedThemeId(themeId)}
            onBlur={() => setFocusedThemeId(null)}
            onKeyDown={(event) => moveFocus(event, index)}
            onChoose={() => chooseTheme(themeId)}
          />
        </li>
      ))}
    </ul>
  )
}

interface ThemeOptionProps {
  readonly ref: (button: HTMLButtonElement | null) => void
  readonly theme: Theme
  readonly isChosen: boolean
  readonly onHover: () => void
  readonly onUnhover: () => void
  readonly onFocus: () => void
  readonly onBlur: () => void
  readonly onKeyDown: (event: KeyboardEvent) => void
  readonly onChoose: () => void
}

// Only the chosen option is a tab stop, so Tab enters the list on the saved
// theme and the arrow keys move from there.
function ThemeOption(props: ThemeOptionProps) {
  const { ref, theme, isChosen, onHover, onUnhover, onFocus, onBlur, onKeyDown, onChoose } = props
  const chosenStyle = isChosen ? "bg-accent/15 font-semibold" : "hover:bg-surface-raised"

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={isChosen}
      aria-label={`${theme.name} by ${theme.author}`}
      tabIndex={isChosen ? 0 : -1}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
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
