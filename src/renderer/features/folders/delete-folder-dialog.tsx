import { useRef } from "react"
import type { Folder } from "../../../shared/folders"
import { formatCount } from "../../ui/format-count"
import { ModalDialog } from "../../ui/modal-dialog"
import { AccentButton, SecondaryButton } from "../../ui/pill-button"

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
        <SecondaryButton label="Cancel" onClick={() => dialogRef.current?.close()} />
        <AccentButton
          label="Delete folder"
          onClick={() => {
            onDelete()
            dialogRef.current?.close()
          }}
        />
      </div>
    </ModalDialog>
  )
}
