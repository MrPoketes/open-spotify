import { Check, Trash2 } from "lucide-react"
import type { KeyboardEvent } from "react"
import type { Theme } from "../../../shared/theme"
import { cn } from "../../ui/class-names"
import { rowActionClassName } from "../../ui/row-action-class-name"
import { Tooltip } from "../../ui/tooltip"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import { useRowShortcut } from "../shortcuts/use-row-shortcut"
import { ThemeSwatch } from "./theme-swatch"

export type DeleteTrigger = "keyboard" | "pointer"

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
  // Built-in themes cannot be deleted, so they get no delete control.
  readonly onDelete: ((trigger: DeleteTrigger) => void) | null
}

// The chosen row is marked like a pressed toggle, by lightness and weight
// rather than the accent (docs/design.md, Color roles). The delete button
// stays out of the tab order, so the list remains one tab stop; keyboard users
// delete the focused row with a shortcut.
export function ThemeOption(props: ThemeOptionProps) {
  const { theme, isChosen, rovingProps, onKeyDown, onHover, onUnhover, onFocus, onBlur } = props
  const { onChoose, onDelete } = props
  const deleteLabel = `Delete ${theme.name}`
  const deleteShortcut = useRowShortcut("deleteTheme")

  const deleteWithKey = (event: KeyboardEvent) => {
    if (onDelete === null || !deleteShortcut.isPressed(event)) {
      onKeyDown(event)
      return
    }
    event.preventDefault()
    onDelete("keyboard")
  }

  return (
    // The pointer handlers sit on the whole row, so moving onto the delete
    // button keeps previewing the row's theme instead of flashing the saved one.
    <div
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      className="group flex items-center rounded-small transition-colors duration-120 ease-out hover:bg-surface-raised"
    >
      <button
        type="button"
        {...rovingProps}
        aria-pressed={isChosen}
        aria-label={`${theme.name} by ${theme.author}`}
        aria-keyshortcuts={onDelete === null ? undefined : deleteShortcut.ariaKeyShortcuts}
        onKeyDown={deleteWithKey}
        onFocus={() => {
          rovingProps.onFocus()
          onFocus()
        }}
        onBlur={onBlur}
        onClick={onChoose}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-small p-3 text-left text-sm"
      >
        {/* The ring sits outside the swatch, which draws its own theme's colors. */}
        <span className={cn("rounded-small", isChosen && "ring-2 ring-foreground")}>
          <ThemeSwatch theme={theme} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate", isChosen && "font-semibold")}>{theme.name}</span>
          <span className="truncate text-xs text-muted">by {theme.author}</span>
        </span>
        {isChosen && <Check aria-hidden size={16} />}
      </button>
      {onDelete !== null && (
        <Tooltip label={deleteLabel} shortcut={deleteShortcut.label}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={deleteLabel}
            onClick={() => onDelete("pointer")}
            className={`mr-3 ${rowActionClassName}`}
          >
            <Trash2 aria-hidden size={20} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
