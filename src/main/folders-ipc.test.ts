import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { ipcChannels } from "../shared/ipc-channels"
import { MalformedIpcRequest } from "./decode-ipc-request"
import { album, freshFolders } from "./folders-fakes"
import { folderIpcOperations } from "./folders-ipc"

describe("folder IPC", () => {
  // IPC replies are structured-cloned, so the tree must reach the renderer as
  // plain data that its Schema decodes.
  it.effect("applies folder operations sent by the renderer and replies with the tree", () =>
    Effect.gen(function* () {
      const folderId = yield* folderIpcOperations[ipcChannels.createFolder]({
        name: "Rock",
        parentFolderId: null,
      })
      yield* folderIpcOperations[ipcChannels.renameFolder]({ folderId, name: "Classic rock" })
      yield* folderIpcOperations[ipcChannels.addFolderItem]({ folderId, item: album })

      const reply = yield* folderIpcOperations[ipcChannels.getFolderTree]()

      assert.deepStrictEqual(structuredClone(reply), [
        { _tag: "Folder", id: folderId, name: "Classic rock", entries: [album] },
      ])
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("rejects a folder name that is empty or only whitespace", () =>
    Effect.gen(function* () {
      const createFolder = folderIpcOperations[ipcChannels.createFolder]

      const emptyNameError = yield* Effect.flip(createFolder({ name: "", parentFolderId: null }))
      const blankNameError = yield* Effect.flip(createFolder({ name: "  ", parentFolderId: null }))

      assert.instanceOf(emptyNameError, MalformedIpcRequest)
      assert.instanceOf(blankNameError, MalformedIpcRequest)
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("rejects an item whose URI is not a Spotify URI", () =>
    Effect.gen(function* () {
      const folderId = yield* folderIpcOperations[ipcChannels.createFolder]({
        name: "Rock",
        parentFolderId: null,
      })

      const error = yield* Effect.flip(
        folderIpcOperations[ipcChannels.addFolderItem]({
          folderId,
          item: { ...album, uri: "https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy" },
        }),
      )

      assert.instanceOf(error, MalformedIpcRequest)
      assert.strictEqual(error.channel, "folders:add-item")
    }).pipe(Effect.provide(freshFolders())),
  )
})
