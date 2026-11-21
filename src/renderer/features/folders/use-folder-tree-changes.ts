import { Effect } from "effect"
import { useLayoutEffect, useRef, useState } from "react"
import type { Folder, FolderTree } from "../../../shared/folders"
import { DesktopBridge } from "../../lib/desktop-bridge"
import type { RowFocusHandle } from "../../ui/use-roving-focus"
import type { FocusAfterRename } from "./folder-rename-field"
import { useChangeFolders } from "./use-change-folders"

// A new folder starts with this name, selected in its rename field, so the
// user can type over it at once.
const newFolderName = "New folder"

// Focus follows a change that replaces or removes the focused row. When a
// rename ends, the folder's row takes focus back from the field unless the
// user moved focus to another control. A deleted folder hands focus to the
// row that takes its place once the tree has been read again, or to the New
// folder button when no folder is left.
function useFocusAfterFolderChange(tree: FolderTree) {
  const rowFocusRef = useRef<RowFocusHandle>(null)
  const newFolderButtonRef = useRef<HTMLButtonElement>(null)
  const rowToFocusAfterRender = useRef<number | null>(null)
  const rowToFocusAfterTreeChange = useRef<number | null>(null)

  useLayoutEffect(() => {
    const row = rowToFocusAfterRender.current
    rowToFocusAfterRender.current = null
    if (row !== null) rowFocusRef.current?.focusRow(row)
  })

  useLayoutEffect(() => {
    const row = rowToFocusAfterTreeChange.current
    if (row === null) return
    rowToFocusAfterTreeChange.current = null
    if (tree.length === 0) newFolderButtonRef.current?.focus()
    else rowFocusRef.current?.focusRow(row)
  }, [tree])

  return {
    rowFocusRef,
    newFolderButtonRef,
    focusRowAfterRender: (row: number) => {
      rowToFocusAfterRender.current = row
    },
    focusRowAfterTreeChange: (row: number) => {
      rowToFocusAfterTreeChange.current = row
    },
  }
}

// Creates, renames, and deletes folders from the sidebar tree. rowIndex gives
// the position of a folder's row among the visible rows.
export function useFolderTreeChanges(tree: FolderTree, rowIndex: (folderId: string) => number) {
  const changeFolders = useChangeFolders()
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const focus = useFocusAfterFolderChange(tree)

  const endRenaming = (folder: Folder, focusAfter: FocusAfterRename) => {
    if (focusAfter === "focusRow") focus.focusRowAfterRender(rowIndex(folder.id))
    setRenamingFolderId(null)
  }

  const createFolder = (parentFolderId: string | null) => {
    const creation = Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      const folderId = yield* bridge.createFolder({ name: newFolderName, parentFolderId })
      yield* Effect.sync(() => setRenamingFolderId(folderId))
    })
    changeFolders(creation, {
      success: `Created ${newFolderName}`,
      failure: () => "Couldn't create a folder.",
      failureLog: "Could not create a folder",
    })
  }

  const rename = (folder: Folder, name: string, focusAfter: FocusAfterRename) => {
    endRenaming(folder, focusAfter)
    if (name === folder.name) return
    const renaming = Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      yield* bridge.renameFolder({ folderId: folder.id, name })
    })
    changeFolders(renaming, {
      success: `Renamed to ${name}`,
      failure: () => `Couldn't rename ${folder.name}.`,
      failureLog: "Could not rename a folder",
    })
  }

  const deleteFolder = (folder: Folder) => {
    focus.focusRowAfterTreeChange(rowIndex(folder.id))
    const deletion = Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      yield* bridge.deleteFolder({ folderId: folder.id })
    })
    changeFolders(deletion, {
      success: `Deleted ${folder.name}`,
      failure: () => `Couldn't delete ${folder.name}.`,
      failureLog: "Could not delete a folder",
    })
  }

  return {
    renamingFolderId,
    rowFocusRef: focus.rowFocusRef,
    newFolderButtonRef: focus.newFolderButtonRef,
    createFolder,
    startRenaming: (folder: Folder) => setRenamingFolderId(folder.id),
    cancelRenaming: endRenaming,
    rename,
    deleteFolder,
  }
}
