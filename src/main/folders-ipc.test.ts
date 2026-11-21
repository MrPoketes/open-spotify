import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { SqlClient } from "effect/sql"
import { FolderChangeError, FolderId, FolderMovedIntoOwnSubtree } from "../shared/folders"
import { ipcChannels } from "../shared/ipc-channels"
import { MalformedIpcRequest } from "../shared/malformed-ipc-request"
import { album, freshFolders } from "./folders-fakes"
import { folderIpcOperations } from "./folders-ipc"
import { replyAsRendererReceives } from "./reply-as-renderer-receives"

const failureAsRendererReceives = (reply: unknown) =>
  replyAsRendererReceives(Schema.Never, FolderChangeError, reply)

const createFolderNamed = Effect.fn("createFolderNamed")(function* (
  name: string,
  parentFolderId: string | null,
) {
  const reply = yield* folderIpcOperations[ipcChannels.createFolder]({ name, parentFolderId })
  return replyAsRendererReceives(FolderId, Schema.Never, reply)
})

describe("folder IPC", () => {
  it.effect("applies folder operations sent by the renderer and replies with the tree", () =>
    Effect.gen(function* () {
      const folderId = yield* createFolderNamed("Rock", null)
      yield* folderIpcOperations[ipcChannels.renameFolder]({ folderId, name: "Classic rock" })
      yield* folderIpcOperations[ipcChannels.addFolderItem]({ folderId, item: album })

      const reply = yield* folderIpcOperations[ipcChannels.getFolderTree]()

      assert.deepStrictEqual(structuredClone(reply), [
        { _tag: "Folder", id: folderId, name: "Classic rock", entries: [album] },
      ])
    }).pipe(Effect.provide(freshFolders())),
  )

  // The sidebar tells this apart from a folder that no longer exists, so the
  // tag and fields must survive the trip.
  it.effect("replies with FolderMovedIntoOwnSubtree when a folder moves into its subfolder", () =>
    Effect.gen(function* () {
      const folderId = yield* createFolderNamed("Rock", null)
      const subfolderId = yield* createFolderNamed("Classics", folderId)

      const reply = yield* folderIpcOperations[ipcChannels.moveFolder]({
        folderId,
        parentFolderId: subfolderId,
        position: 0,
      })

      assert.deepStrictEqual(
        failureAsRendererReceives(reply),
        new FolderMovedIntoOwnSubtree({ folderId, parentFolderId: subfolderId }),
      )
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("replies with MalformedIpcRequest for a folder name that is empty or blank", () =>
    Effect.gen(function* () {
      const createFolder = folderIpcOperations[ipcChannels.createFolder]

      const emptyNameReply = yield* createFolder({ name: "", parentFolderId: null })
      const blankNameReply = yield* createFolder({ name: "  ", parentFolderId: null })

      assert.instanceOf(failureAsRendererReceives(emptyNameReply), MalformedIpcRequest)
      assert.instanceOf(failureAsRendererReceives(blankNameReply), MalformedIpcRequest)
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("replies with MalformedIpcRequest for an item whose URI is not a Spotify URI", () =>
    Effect.gen(function* () {
      const folderId = yield* createFolderNamed("Rock", null)

      const reply = yield* folderIpcOperations[ipcChannels.addFolderItem]({
        folderId,
        item: { ...album, uri: "https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy" },
      })

      const error = failureAsRendererReceives(reply)
      assert.instanceOf(error, MalformedIpcRequest)
      assert.strictEqual(error.channel, "folders:add-item")
    }).pipe(Effect.provide(freshFolders())),
  )

  // The renderer cannot act on a broken database, so the invoke rejects and
  // the renderer sees DesktopBridgeError.
  it.effect("fails instead of replying when the database fails", () =>
    Effect.gen(function* () {
      const folderId = yield* createFolderNamed("Rock", null)
      const sql = yield* SqlClient.SqlClient
      yield* sql`DROP TABLE folder_entries`

      const error = yield* Effect.flip(
        folderIpcOperations[ipcChannels.renameFolder]({ folderId, name: "Classic rock" }),
      )

      assert.strictEqual(error._tag, "SqlError")
    }).pipe(Effect.provide(freshFolders())),
  )
})
