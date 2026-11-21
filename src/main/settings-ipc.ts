import { Effect, Schema } from "effect"
import { ipcChannels } from "../shared/ipc-channels"
import {
  GetSettingRequest,
  SetSettingRequest,
  type SettingKey,
  SettingReply,
  type SettingValue,
  settingSchemas,
} from "../shared/settings"
import { MalformedIpcRequest } from "../shared/malformed-ipc-request"
import { decodeIpcRequest } from "./decode-ipc-request"
import { replyWithTaggedFailures } from "./reply-with-tagged-failures"
import { Settings } from "./settings"

export const getSettingFromIpc = Effect.fn("getSettingFromIpc")(function* (request: unknown) {
  const { key } = yield* decodeIpcRequest(ipcChannels.getSetting, GetSettingRequest, request)
  const settings = yield* Settings
  const value = yield* settings.get(key)
  return yield* Schema.encodeEffect(SettingReply(key))(value)
}, replyWithTaggedFailures(MalformedIpcRequest))

export const setSettingFromIpc = Effect.fn("setSettingFromIpc")(function* (request: unknown) {
  const { key, value } = yield* decodeIpcRequest(ipcChannels.setSetting, SetSettingRequest, request)
  // Without the explicit type, TypeScript infers it from one member of the
  // union of setting Schemas and rejects the others.
  const decodedValue = yield* decodeIpcRequest<SettingValue<SettingKey>>(
    ipcChannels.setSetting,
    settingSchemas[key],
    value,
  )
  const settings = yield* Settings
  yield* settings.set(key, decodedValue)
}, replyWithTaggedFailures(MalformedIpcRequest))
