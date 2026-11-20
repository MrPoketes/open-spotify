import { Layer, ManagedRuntime } from "effect"
import { createContext } from "react"
import { Player } from "../features/playback/player"
import { SpotifyAccessToken } from "../features/spotify/spotify-access-token"
import { SpotifyApi } from "../features/spotify/spotify-api"
import { DesktopBridge } from "./desktop-bridge"

// Runs Effect programs from React and router code. Every service the
// renderer depends on is provided here, in one place.
export const rendererRuntime = ManagedRuntime.make(
  Player.layer.pipe(
    Layer.provideMerge(SpotifyApi.layer),
    Layer.provideMerge(SpotifyAccessToken.layer),
    Layer.provideMerge(DesktopBridge.layer),
  ),
)

export type RendererServices = DesktopBridge | SpotifyApi | Player

// Components run effects through this context instead of importing
// rendererRuntime, so a test can give them a runtime over fake services.
export const RendererRuntimeContext =
  createContext<ManagedRuntime.ManagedRuntime<RendererServices, never>>(rendererRuntime)
