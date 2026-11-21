import { Effect } from "effect"
import { use } from "react"
import type { Folder, SpotifyItem } from "../../../shared/folders"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { useShowStatusMessage } from "../../ui/status-message-context"
import type { AnnouncedOutcome } from "../../ui/use-run-announced"
import { type AddToFolderActions, addToFolderItem, holdsItem } from "./add-to-folder-item"
import { AskForFolderNameContext } from "./ask-for-folder-name"
import { useFolderTree } from "./folder-tree"
import { type FolderChangeFailure, useChangeFolders } from "./use-change-folders"

// What a menu knows about the playlist, artist, album, show, or track it
// belongs to.
export interface FolderItemSource {
  readonly uri: string
  readonly name: string
  readonly images: ReadonlyArray<{ readonly url: string }>
}

// A folder shows its items as cards, so it keeps the widest image, which
// Spotify lists first.
export const toSpotifyItem = ({ uri, name, images }: FolderItemSource): SpotifyItem => ({
  _tag: "SpotifyItem",
  uri,
  name,
  imageUrl: images[0]?.url ?? null,
})

const addOutcome = (folderName: string): AnnouncedOutcome<FolderChangeFailure> => ({
  success: `Added to ${folderName}`,
  failure: () => `Couldn't add to ${folderName}.`,
  failureLog: "Could not add an item to a folder",
})

const removeOutcome = (folderName: string): AnnouncedOutcome<FolderChangeFailure> => ({
  success: `Removed from ${folderName}`,
  failure: () => `Couldn't remove from ${folderName}.`,
  failureLog: "Could not remove an item from a folder",
})

// Adds the item last in the folder and says so.
export function useAddFolderItem() {
  const changeFolders = useChangeFolders()
  return (folder: Folder, item: SpotifyItem) => {
    const addition = Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      yield* bridge.addFolderItem({ folderId: folder.id, item })
    })
    changeFolders(addition, addOutcome(folder.name))
  }
}

export function useAddToFolder() {
  const folderTree = useFolderTree()
  const askForFolderName = use(AskForFolderNameContext)
  const showStatusMessage = useShowStatusMessage()
  const changeFolders = useChangeFolders()
  const addFolderItem = useAddFolderItem()

  const actions: AddToFolderActions = {
    toggleItem: (folder, item) => {
      if (!holdsItem(folder, item.uri)) {
        addFolderItem(folder, item)
        return
      }
      const removal = Effect.gen(function* () {
        const bridge = yield* DesktopBridge
        yield* bridge.removeFolderItem({ folderId: folder.id, uri: item.uri })
      })
      changeFolders(removal, removeOutcome(folder.name))
    },
    addToNewFolder: (item) =>
      askForFolderName((name) => {
        const creation = Effect.gen(function* () {
          const bridge = yield* DesktopBridge
          const folderId = yield* bridge.createFolder({ name, parentFolderId: null })
          yield* bridge.addFolderItem({ folderId, item })
        })
        changeFolders(creation, addOutcome(name))
      }),
    explainMissingFolders: () => {
      if (folderTree.state.status === "failed") {
        folderTree.retry()
        showStatusMessage({ text: "Your folders didn't load. Trying again.", isFailure: true })
        return
      }
      showStatusMessage({ text: "Your folders are still loading.", isFailure: false })
    },
  }

  return (source: FolderItemSource) =>
    addToFolderItem(toSpotifyItem(source), folderTree.state, actions)
}
