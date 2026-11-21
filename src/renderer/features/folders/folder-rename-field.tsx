import { type FocusEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react"
import { hasShortcutModifier } from "../../ui/has-shortcut-modifier"
import { blankFolderNameMessage } from "./blank-folder-name-message"

// Where focus goes once the rename ends and the row replaces the field. After
// Enter or Escape, or a click on the row itself, the row takes focus. After
// the user moves to another control, focus stays there.
export type FocusAfterRename = "focusRow" | "keepFocus"

interface FolderRenameFieldProps {
  readonly folderName: string
  readonly onRename: (name: string, focusAfter: FocusAfterRename) => void
  readonly onCancel: (focusAfter: FocusAfterRename) => void
}

// Edits a folder's name in place of its row. Enter saves and Escape cancels.
// Leaving the field saves too, as in a file manager, unless the name is blank.
export function FolderRenameField({ folderName, onRename, onCancel }: FolderRenameFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const [name, setName] = useState(folderName)
  const [triedBlankName, setTriedBlankName] = useState(false)
  // Enter or Escape removes the field, and the browser may then report that
  // focus left it, which must not end the rename a second time.
  const isDone = useRef(false)
  const isNameBlank = name.trim() === ""
  const isInvalid = triedBlankName && isNameBlank

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  const finish = (end: () => void) => {
    isDone.current = true
    end()
  }

  const save = (focusAfter: FocusAfterRename) => {
    if (isNameBlank) {
      setTriedBlankName(true)
      return
    }
    finish(() => onRename(name.trim(), focusAfter))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    // App-wide shortcuts listen on the window, so they must get past the field.
    if (hasShortcutModifier(event)) return
    // The tree around the field moves focus on arrow keys, j, and k, which
    // here belong to the text.
    event.stopPropagation()
    if (event.key === "Enter") {
      event.preventDefault()
      save("focusRow")
    }
    if (event.key === "Escape") {
      event.preventDefault()
      finish(() => onCancel("focusRow"))
    }
  }

  // Switching to another app also takes focus from the field, and the browser
  // gives it back on return, so the rename carries on instead.
  const saveOnLeave = (event: FocusEvent) => {
    if (isDone.current || !document.hasFocus()) return
    // A click on the row's icon, padding, or chevron focuses the row around
    // the field, which disappears with the field.
    const isFocusMovingToRow =
      event.relatedTarget instanceof Node && event.relatedTarget.contains(event.currentTarget)
    const focusAfter = isFocusMovingToRow ? "focusRow" : "keepFocus"
    if (isNameBlank) finish(() => onCancel(focusAfter))
    else save(focusAfter)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <input
        ref={input}
        aria-label="Folder name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={saveOnLeave}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
        className="w-full rounded-small bg-surface-raised px-2 py-1 text-sm aria-invalid:ring-2 aria-invalid:ring-danger"
      />
      {isInvalid ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {blankFolderNameMessage}
        </p>
      ) : null}
    </div>
  )
}
