import { type FormEvent, useRef, useState } from "react"
import { ModalDialog } from "../../ui/modal-dialog"
import { AccentButton, SecondaryButton } from "../../ui/pill-button"
import { TextField } from "../../ui/text-field"
import { blankFolderNameMessage } from "./blank-folder-name-message"

interface NewFolderDialogProps {
  readonly onCreate: (name: string) => void
  readonly onClose: () => void
}

// Focus returns to the opener of the menu when the dialog closes.
export function NewFolderDialog({ onCreate, onClose }: NewFolderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState("")
  const [triedToCreate, setTriedToCreate] = useState(false)
  const isNameBlank = name.trim() === ""

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
    <ModalDialog heading="New folder" ref={dialogRef} onClose={onClose}>
      <form onSubmit={create} className="flex flex-col gap-4">
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          errorMessage={triedToCreate && isNameBlank ? blankFolderNameMessage : undefined}
        />
        <div className="flex justify-end gap-2">
          <SecondaryButton label="Cancel" onClick={() => dialogRef.current?.close()} />
          <AccentButton type="submit" label="Create folder" />
        </div>
      </form>
    </ModalDialog>
  )
}
