import { Effect, Schema } from "effect"
import { ipcChannels } from "../shared/ipc-channels"
import {
  GetSettingRequest,
  SetSettingRequest,
  settingReply,
  settingSchemas,
} from "../shared/settings"
import { decodeIpcRequest } from "./decode-ipc-request"
import { Settings } from "./settings"

export const getSettingFromIpc = Effect.fn("getSettingFromIpc")(function* (request: unknown) {
  const { key } = yield* decodeIpcRequest(ipcChannels.getSetting, GetSettingRequest, request)
  const settings = yield* Settings
  const value = yield* settings.get(key)
  return yield* Schema.encodeEffect(settingReply(key))(value)
})

export const setSettingFromIpc = Effect.fn("setSettingFromIpc")(function* (request: unknown) {
  const { key, value } = yield* decodeIpcRequest(ipcChannels.setSetting, SetSettingRequest, request)
  const decodedValue = yield* decodeIpcRequest(ipcChannels.setSetting, settingSchemas[key], value)
  const settings = yield* Settings
  yield* settings.set(key, decodedValue)
})
