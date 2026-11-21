import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react"
import { blankFolderNameMessage } from "./blank-folder-name-message"

// How a rename ended. Ended with Enter or Escape, focus goes back to the row;
// ended by leaving the field, it stays on the control the user moved to.
export type RenameEnd = "key" | "leave"

interface FolderRenameFieldProps {
  readonly folderName: string
  readonly onRename: (name: string, end: RenameEnd) => void
  readonly onCancel: (end: RenameEnd) => void
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

  const save = (end: RenameEnd) => {
    if (isNameBlank) {
      setTriedBlankName(true)
      return
    }
    finish(() => onRename(name.trim(), end))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    // The tree around the field moves focus on arrow keys, j, and k, which
    // here belong to the text.
    event.stopPropagation()
    if (event.key === "Enter") {
      event.preventDefault()
      save("key")
    }
    if (event.key === "Escape") {
      event.preventDefault()
      finish(() => onCancel("key"))
    }
  }

  const saveOnLeave = () => {
    if (isDone.current) return
    if (isNameBlank) finish(() => onCancel("leave"))
    else save("leave")
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
