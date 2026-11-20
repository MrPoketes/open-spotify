import { Layer, ManagedRuntime } from "effect"
import { createContext } from "react"
import { SpotifyAccessToken } from "../features/spotify/spotify-access-token"
import { SpotifyApi } from "../features/spotify/spotify-api"
import { DesktopBridge } from "./desktop-bridge"

// Runs Effect programs from React and router code. Every service the
// renderer depends on is provided here, in one place.
export const rendererRuntime = ManagedRuntime.make(
  SpotifyApi.layer.pipe(
    Layer.provideMerge(SpotifyAccessToken.layer),
    Layer.provideMerge(DesktopBridge.layer),
  ),
)

// Components run effects through this context instead of importing
// rendererRuntime, so a test can give them a runtime over fake services.
export const RendererRuntimeContext =
  createContext<ManagedRuntime.ManagedRuntime<DesktopBridge | SpotifyApi, never>>(rendererRuntime)
