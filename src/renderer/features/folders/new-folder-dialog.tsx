import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useRef, useState, type FormEvent } from "react"
import { Button } from "../../ui/button"
import { Dialog } from "../../ui/dialog"
import { TextField } from "../../ui/text-field"
import { blankFolderNameMessage } from "./blank-folder-name-message"

interface NewFolderDialogProps {
  readonly onCreate: (name: string) => void
  readonly onClose: () => void
}

// Focus starts in the Name field and returns to the opener of the menu when
// the dialog closes.
export function NewFolderDialog({ onCreate, onClose }: NewFolderDialogProps) {
  const dialogActions = useRef<DialogPrimitive.Root.Actions>(null)
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
    dialogActions.current?.close()
  }

  return (
    <Dialog title="New folder" actionsRef={dialogActions} onClosed={onClose}>
      <form onSubmit={create} className="flex flex-col gap-4">
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          errorMessage={triedToCreate && isNameBlank ? blankFolderNameMessage : undefined}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => dialogActions.current?.close()}>
            Cancel
          </Button>
          <Button type="submit">Create folder</Button>
        </div>
      </form>
    </Dialog>
  )
}
