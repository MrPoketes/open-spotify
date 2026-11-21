import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { MalformedIpcRequest } from "./decode-ipc-request"
import { freshSettings } from "./settings-fakes"
import { getSettingFromIpc, setSettingFromIpc } from "./settings-ipc"

describe("settings IPC", () => {
  // IPC replies are structured-cloned, so a missing setting must cross as
  // null rather than as an Option the renderer cannot decode.
  it.effect("replies with null until the renderer stores a value, then with the value", () =>
    Effect.gen(function* () {
      const request = { key: "spotifyClientId" }

      const replyBeforeSet = yield* getSettingFromIpc(request)
      yield* setSettingFromIpc({ key: "spotifyClientId", value: "my-client-id" })
      const replyAfterSet = yield* getSettingFromIpc(request)

      assert.strictEqual(replyBeforeSet, null)
      assert.strictEqual(replyAfterSet, "my-client-id")
    }).pipe(Effect.provide(freshSettings())),
  )

  it.effect("rejects a request for a setting that does not exist", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(getSettingFromIpc({ key: "notASetting" }))

      assert.instanceOf(error, MalformedIpcRequest)
      assert.strictEqual(error.channel, "settings:get")
    }).pipe(Effect.provide(freshSettings())),
  )

  it.effect("rejects a value that does not satisfy the setting's schema", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(setSettingFromIpc({ key: "spotifyClientId", value: "" }))

      assert.instanceOf(error, MalformedIpcRequest)
      assert.strictEqual(error.channel, "settings:set")
    }).pipe(Effect.provide(freshSettings())),
  )
})
