import { Check, Trash2 } from "lucide-react"
import type { KeyboardEvent } from "react"
import type { Theme } from "../../../shared/theme"
import { hasShortcutModifier } from "../../ui/has-shortcut-modifier"
import type { RovingRowProps } from "../../ui/use-roving-focus"
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

// Mac keyboards label Backspace "delete" and have no forward Delete key.
const isDeleteKey = (event: KeyboardEvent) =>
  (event.key === "Delete" || event.key === "Backspace") && !hasShortcutModifier(event)

// The delete button stays out of the tab order, so the list remains one tab
// stop (docs/design.md); keyboard users press Delete on the focused row.
export function ThemeOption(props: ThemeOptionProps) {
  const { theme, isChosen, rovingProps, onKeyDown, onHover, onUnhover, onFocus, onBlur } = props
  const { onChoose, onDelete } = props
  const chosenStyle = isChosen ? "bg-accent/15 font-semibold" : "hover:bg-surface-raised"
  const deleteLabel = `Delete ${theme.name}`

  const deleteWithKey = (event: KeyboardEvent) => {
    if (onDelete === null || !isDeleteKey(event)) {
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
      className={`group flex items-center rounded-small transition-colors duration-120 ease-out ${chosenStyle}`}
    >
      <button
        type="button"
        {...rovingProps}
        aria-pressed={isChosen}
        aria-label={`${theme.name} by ${theme.author}`}
        aria-keyshortcuts={onDelete === null ? undefined : "Delete Backspace"}
        onKeyDown={deleteWithKey}
        onFocus={() => {
          rovingProps.onFocus()
          onFocus()
        }}
        onBlur={onBlur}
        onClick={onChoose}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-small p-3 text-left text-sm"
      >
        <ThemeSwatch theme={theme} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{theme.name}</span>
          <span className="truncate text-xs font-normal text-muted">by {theme.author}</span>
        </span>
        {isChosen && <Check aria-hidden size={16} />}
      </button>
      {onDelete !== null && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={deleteLabel}
          title={`${deleteLabel} (Delete)`}
          onClick={() => onDelete("pointer")}
          className="mr-3 flex size-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity duration-120 ease-out group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground"
        >
          <Trash2 aria-hidden size={20} />
        </button>
      )}
    </div>
  )
}
