import { type Effect, type Fiber, Layer, ManagedRuntime } from "effect"
import { createContext } from "react"
import { Player } from "../features/playback/player"
import { SpotifyAccessToken } from "../features/spotify/spotify-access-token"
import { SpotifyApi } from "../features/spotify/spotify-api"
import { DesktopBridge } from "./desktop-bridge"

export type RendererServices = DesktopBridge | SpotifyApi | Player

// Forked fibers have no caller to receive a failure, so every typed error must
// be handled before runFork.
type RendererRuntime = Omit<ManagedRuntime.ManagedRuntime<RendererServices, never>, "runFork"> & {
  readonly runFork: <A>(
    self: Effect.Effect<A, never, RendererServices>,
    options?: Effect.RunOptions,
  ) => Fiber.Fiber<A>
}

// Runs Effect programs from React and router code. Every service the
// renderer depends on is provided here, in one place.
export const rendererRuntime: RendererRuntime = ManagedRuntime.make(
  Player.layer.pipe(
    Layer.provideMerge(SpotifyApi.layer),
    Layer.provideMerge(SpotifyAccessToken.layer),
    Layer.provideMerge(DesktopBridge.layer),
  ),
)

// Components run effects through this context instead of importing
// rendererRuntime, so a test can give them a runtime over fake services.
export const RendererRuntimeContext = createContext<RendererRuntime>(rendererRuntime)
