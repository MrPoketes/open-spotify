import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { desktopBridgeOver } from "../../lib/desktop-bridge-fakes"
import { loadInitialClientId } from "./initial-client-id"

// A missing Client ID travels as null on both channels.
const mainProcessWith = ({
  savedClientId,
  environmentClientId,
}: {
  readonly savedClientId: string | null
  readonly environmentClientId: string | null
}): DesktopApi => ({
  invoke: (channel) =>
    Promise.resolve(
      channel === ipcChannels.getEnvironmentClientId ? environmentClientId : savedClientId,
    ),
})

const initialClientIdWith = (mainProcess: DesktopApi) =>
  loadInitialClientId.pipe(Effect.provide(desktopBridgeOver(mainProcess)))

describe("loadInitialClientId", () => {
  it.effect("prefers the saved Client ID over OPEN_SPOTIFY_CLIENT_ID", () =>
    Effect.gen(function* () {
      const initialClientId = yield* initialClientIdWith(
        mainProcessWith({ savedClientId: "saved-client-id", environmentClientId: "env-client-id" }),
      )

      assert.strictEqual(initialClientId, "saved-client-id")
    }),
  )

  it.effect("falls back to OPEN_SPOTIFY_CLIENT_ID before a Client ID is saved", () =>
    Effect.gen(function* () {
      const initialClientId = yield* initialClientIdWith(
        mainProcessWith({ savedClientId: null, environmentClientId: "env-client-id" }),
      )

      assert.strictEqual(initialClientId, "env-client-id")
    }),
  )

  it.effect("starts empty when neither Client ID exists", () =>
    Effect.gen(function* () {
      const initialClientId = yield* initialClientIdWith(
        mainProcessWith({ savedClientId: null, environmentClientId: null }),
      )

      assert.strictEqual(initialClientId, "")
    }),
  )
})
