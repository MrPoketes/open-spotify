import { Effect, type Schema } from "effect"
import {
  AddFolderItemRequest,
  CreateFolderRequest,
  DeleteFolderRequest,
  FolderChangeError,
  MoveFolderItemRequest,
  MoveFolderRequest,
  RemoveFolderItemRequest,
  RenameFolderRequest,
} from "../shared/folders"
import { type IpcChannel, ipcChannels } from "../shared/ipc-channels"
import { decodeIpcRequest } from "./decode-ipc-request"
import { Folders } from "./folders"
import { replyWithTaggedFailures } from "./reply-with-tagged-failures"

const decodedFolderOperation = <Request, Reply, E>(
  channel: IpcChannel,
  requestSchema: Schema.Decoder<Request>,
  operation: (folders: Folders["Service"], request: Request) => Effect.Effect<Reply, E>,
) =>
  Effect.fn(channel)(function* (request: unknown) {
    const decodedRequest = yield* decodeIpcRequest(channel, requestSchema, request)
    const folders = yield* Folders
    return yield* operation(folders, decodedRequest)
  }, replyWithTaggedFailures(FolderChangeError))

export const folderIpcOperations = {
  [ipcChannels.getFolderTree]: () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      return yield* folders.readTree
    }),
  [ipcChannels.createFolder]: decodedFolderOperation(
    ipcChannels.createFolder,
    CreateFolderRequest,
    (folders, request) => folders.createFolder(request),
  ),
  [ipcChannels.renameFolder]: decodedFolderOperation(
    ipcChannels.renameFolder,
    RenameFolderRequest,
    (folders, request) => folders.renameFolder(request),
  ),
  [ipcChannels.deleteFolder]: decodedFolderOperation(
    ipcChannels.deleteFolder,
    DeleteFolderRequest,
    (folders, request) => folders.deleteFolder(request),
  ),
  [ipcChannels.addFolderItem]: decodedFolderOperation(
    ipcChannels.addFolderItem,
    AddFolderItemRequest,
    (folders, request) => folders.addItem(request),
  ),
  [ipcChannels.removeFolderItem]: decodedFolderOperation(
    ipcChannels.removeFolderItem,
    RemoveFolderItemRequest,
    (folders, request) => folders.removeItem(request),
  ),
  [ipcChannels.moveFolder]: decodedFolderOperation(
    ipcChannels.moveFolder,
    MoveFolderRequest,
    (folders, request) => folders.moveFolder(request),
  ),
  [ipcChannels.moveFolderItem]: decodedFolderOperation(
    ipcChannels.moveFolderItem,
    MoveFolderItemRequest,
    (folders, request) => folders.moveItem(request),
  ),
}
