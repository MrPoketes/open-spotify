import { Context, Effect, Layer } from "effect"
import type { AccessTokenError } from "../../../shared/spotify-auth-replies"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"

// Keeping the token behind its own service lets the API client be tested with
// a fixed token instead of a login.
export class SpotifyAccessToken extends Context.Service<
  SpotifyAccessToken,
  {
    readonly get: Effect.Effect<string, AccessTokenError | DesktopBridgeError>
  }
>()("open-spotify/SpotifyAccessToken") {
  static readonly layer = Layer.effect(
    SpotifyAccessToken,
    Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      return SpotifyAccessToken.of({ get: bridge.getAccessToken })
    }),
  )
}
