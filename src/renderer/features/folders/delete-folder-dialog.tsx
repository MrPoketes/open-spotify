import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useRef } from "react"
import type { Folder } from "../../../shared/folders"
import { Button } from "../../ui/button"
import { OpenOnMountDialog } from "../../ui/dialog"
import { formatCount } from "../../ui/format-count"

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

// The delete waits until the dialog has closed and given focus back to the
// row. Started any earlier, it removes the row while focus is still in the
// closing dialog, and focus falls to the page instead of the next row.
export function DeleteFolderDialog({ folder, onDelete, onClose }: DeleteFolderDialogProps) {
  const dialogActions = useRef<DialogPrimitive.Root.Actions>(null)
  const isDeleteChosen = useRef(false)
  const closeAndDeleteIfChosen = () => {
    if (isDeleteChosen.current) onDelete()
    onClose()
  }
  return (
    <OpenOnMountDialog
      title={`Delete ${folder.name}?`}
      actionsRef={dialogActions}
      onClosed={closeAndDeleteIfChosen}
    >
      <p className="text-sm">{describeDeletion(folder)}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => dialogActions.current?.close()}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            isDeleteChosen.current = true
            dialogActions.current?.close()
          }}
        >
          Delete folder
        </Button>
      </div>
    </OpenOnMountDialog>
  )
}
