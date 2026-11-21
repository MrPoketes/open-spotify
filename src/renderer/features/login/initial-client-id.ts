import { Effect, Option } from "effect"
import { DesktopBridge } from "../../lib/desktop-bridge"

// A user who comes back to change the Client ID starts from the saved one.
export const loadInitialClientId = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const savedClientId = yield* bridge.getSetting("spotifyClientId")
  const initialClientId = Option.isSome(savedClientId)
    ? savedClientId
    : yield* bridge.getEnvironmentClientId
  return Option.getOrElse(initialClientId, () => "")
})
