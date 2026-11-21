import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { MalformedIpcRequest } from "../shared/malformed-ipc-request"
import { replyAsRendererReceives } from "./reply-as-renderer-receives"
import { freshSettings } from "./settings-fakes"
import { getSettingFromIpc, setSettingFromIpc } from "./settings-ipc"

const failureAsRendererReceives = (reply: unknown) =>
  replyAsRendererReceives(Schema.Never, MalformedIpcRequest, reply)

describe("settings IPC", () => {
  // IPC replies are structured-cloned, so a missing setting must cross as
  // null rather than as an Option the renderer cannot decode.
  it.effect("replies with null until the renderer stores a value, then with the value", () =>
    Effect.gen(function* () {
      const request = { key: "spotifyClientId" }

      const replyBeforeSet = yield* getSettingFromIpc(request)
      yield* setSettingFromIpc({ key: "spotifyClientId", value: "my-client-id" })
      const replyAfterSet = yield* getSettingFromIpc(request)

      assert.deepStrictEqual(replyBeforeSet, { _tag: "IpcSucceeded", value: null })
      assert.deepStrictEqual(replyAfterSet, { _tag: "IpcSucceeded", value: "my-client-id" })
    }).pipe(Effect.provide(freshSettings())),
  )

  it.effect("replies with MalformedIpcRequest for a setting that does not exist", () =>
    Effect.gen(function* () {
      const reply = yield* getSettingFromIpc({ key: "notASetting" })

      const error = failureAsRendererReceives(reply)
      assert.instanceOf(error, MalformedIpcRequest)
      assert.strictEqual(error.channel, "settings:get")
    }).pipe(Effect.provide(freshSettings())),
  )

  it.effect("replies with MalformedIpcRequest for a value the setting's schema rejects", () =>
    Effect.gen(function* () {
      const reply = yield* setSettingFromIpc({ key: "spotifyClientId", value: "" })

      const error = failureAsRendererReceives(reply)
      assert.instanceOf(error, MalformedIpcRequest)
      assert.strictEqual(error.channel, "settings:set")
    }).pipe(Effect.provide(freshSettings())),
  )
})
