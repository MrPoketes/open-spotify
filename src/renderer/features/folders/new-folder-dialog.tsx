import { type FormEvent, useEffect, useId, useRef, useState } from "react"
import { AccentButton, SecondaryButton } from "../../ui/pill-button"
import { TextField } from "../../ui/text-field"

interface NewFolderDialogProps {
  readonly onCreate: (name: string) => void
  readonly onClose: () => void
}

// A modal dialog: the browser traps focus inside it, closes it on Escape, and
// gives focus back to the element that had it before, the opener of the menu.
export function NewFolderDialog({ onCreate, onClose }: NewFolderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const [name, setName] = useState("")
  const [triedToCreate, setTriedToCreate] = useState(false)
  const isNameBlank = name.trim() === ""

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const create = (event: FormEvent) => {
    event.preventDefault()
    if (isNameBlank) {
      setTriedToCreate(true)
      return
    }
    onCreate(name.trim())
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
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          errorMessage={triedToCreate && isNameBlank ? "Enter a name for the folder." : undefined}
        />
        <div className="flex justify-end gap-2">
          <SecondaryButton label="Cancel" onClick={() => dialogRef.current?.close()} />
          <AccentButton type="submit" label="Create folder" />
        </div>
      </form>
    </dialog>
  )
}
