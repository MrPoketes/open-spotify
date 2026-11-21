import { Effect } from "effect"
import { use } from "react"
import type { Folder, SpotifyItem } from "../../../shared/folders"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"
import type { RendererServices } from "../../lib/renderer-runtime"
import { useShowStatusMessage } from "../../ui/status-message-context"
import { type AnnouncedOutcome, useRunAnnounced } from "../../ui/use-run-announced"
import { type AddToFolderActions, addToFolderItem, holdsItem } from "./add-to-folder-item"
import { AskForFolderNameContext } from "./ask-for-folder-name"
import { loadFolderTree, useFolderTree } from "./folder-tree"

// What a menu knows about the playlist, artist, album, show, or track it
// belongs to. Images are widest first, as Spotify lists them.
export interface FolderItemSource {
  readonly uri: string
  readonly name: string
  readonly images: ReadonlyArray<{ readonly url: string }>
}

// A folder shows its items as cards, so it keeps the widest image.
const toSpotifyItem = ({ uri, name, images }: FolderItemSource): SpotifyItem => ({
  _tag: "SpotifyItem",
  uri,
  name,
  imageUrl: images[0]?.url ?? null,
})

const addOutcome = (folderName: string): AnnouncedOutcome<DesktopBridgeError> => ({
  success: `Added to ${folderName}`,
  failure: () => `Couldn't add to ${folderName}.`,
  failureLog: "Could not add an item to a folder",
})

const removeOutcome = (folder: Folder): AnnouncedOutcome<DesktopBridgeError> => ({
  success: `Removed from ${folder.name}`,
  failure: () => `Couldn't remove from ${folder.name}.`,
  failureLog: "Could not remove an item from a folder",
})

// Returns the Add to folder item for a menu, given what the menu belongs to.
export function useAddToFolder() {
  const folderTree = useFolderTree()
  const askForFolderName = use(AskForFolderNameContext)
  const runAnnounced = useRunAnnounced()
  const showStatusMessage = useShowStatusMessage()

  // Reads the tree again after the change, so every menu and the open folder
  // page show it.
  const changeFolders = (
    change: Effect.Effect<unknown, DesktopBridgeError, RendererServices>,
    outcome: AnnouncedOutcome<DesktopBridgeError>,
  ) =>
    runAnnounced(
      change.pipe(
        Effect.andThen(loadFolderTree),
        Effect.tap((tree) => Effect.sync(() => folderTree.replace(tree))),
      ),
      outcome,
    )

  const actions: AddToFolderActions = {
    toggleItem: (folder, item) => {
      const folderId = folder.id
      if (holdsItem(folder, item.uri)) {
        const removal = Effect.gen(function* () {
          const bridge = yield* DesktopBridge
          yield* bridge.removeFolderItem({ folderId, uri: item.uri })
        })
        changeFolders(removal, removeOutcome(folder))
        return
      }
      const addition = Effect.gen(function* () {
        const bridge = yield* DesktopBridge
        yield* bridge.addFolderItem({ folderId, item })
      })
      changeFolders(addition, addOutcome(folder.name))
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
