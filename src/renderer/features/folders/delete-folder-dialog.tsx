import { useRef } from "react"
import type { Folder } from "../../../shared/folders"
import { Button } from "../../ui/button"
import { formatCount } from "../../ui/format-count"
import { ModalDialog } from "../../ui/modal-dialog"

// Everything a delete takes with it: the folders inside, and everything in
// them.
const countContents = (folder: Folder): number =>
  folder.entries.reduce(
    (count, entry) => count + 1 + (entry._tag === "Folder" ? countContents(entry) : 0),
    0,
  )

const describeDeletion = (folder: Folder) => {
  const contentCount = countContents(folder)
  if (contentCount === 0) return `This deletes “${folder.name}”, which is empty.`
  const contents = formatCount(contentCount, "item", "items")
  return `This deletes “${folder.name}” and the ${contents} in it. Nothing is removed from your Spotify library.`
}

interface DeleteFolderDialogProps {
  readonly folder: Folder
  readonly onDelete: () => void
  readonly onClose: () => void
}

export function DeleteFolderDialog({ folder, onDelete, onClose }: DeleteFolderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  return (
    <ModalDialog heading={`Delete ${folder.name}?`} ref={dialogRef} onClose={onClose}>
      <p className="text-sm">{describeDeletion(folder)}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onDelete()
            dialogRef.current?.close()
          }}
        >
          Delete folder
        </Button>
      </div>
    </ModalDialog>
  )
}
