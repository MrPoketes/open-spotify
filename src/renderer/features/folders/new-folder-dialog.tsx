import { type FormEvent, useEffect, useId, useRef, useState } from "react"
import { AccentButton, SecondaryButton } from "../../ui/pill-button"

interface NewFolderDialogProps {
  readonly onCreate: (name: string) => void
  readonly onClose: () => void
}

// A modal dialog: the browser traps focus inside it, closes it on Escape, and
// gives focus back to the element that had it before, the opener of the menu.
export function NewFolderDialog({ onCreate, onClose }: NewFolderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const nameErrorId = useId()
  const [name, setName] = useState("")
  const [isNameBlank, setNameBlank] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const create = (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName === "") {
      setNameBlank(true)
      return
    }
    onCreate(trimmedName)
    dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      className="m-auto w-80 rounded-large bg-surface-overlay p-4 text-foreground shadow-overlay transition-[opacity,translate] duration-200 ease-out backdrop:bg-canvas/60 starting:translate-y-2 starting:opacity-0"
    >
      <form onSubmit={create} className="flex flex-col gap-4">
        <h2 id={headingId} className="font-display text-xl font-bold">
          New folder
        </h2>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={isNameBlank}
            aria-describedby={isNameBlank ? nameErrorId : undefined}
            className="rounded-small bg-surface-raised px-3 py-2 text-base font-normal"
          />
        </label>
        {isNameBlank ? (
          <p id={nameErrorId} role="alert" className="text-xs text-danger">
            Enter a name for the folder.
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton label="Cancel" onClick={() => dialogRef.current?.close()} />
          <AccentButton type="submit" label="Create folder" />
        </div>
      </form>
    </dialog>
  )
}
