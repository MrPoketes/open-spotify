import { Layer, ManagedRuntime } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { Player } from "../features/playback/player"
import type { SpotifyApi } from "../features/spotify/spotify-api"
import { spotifyApiFake } from "../features/spotify/spotify-api-fake"
import type { WebPlaybackSdk } from "../features/this-computer/web-playback-sdk"
import { webPlaybackSdkNeverReady } from "../features/this-computer/web-playback-sdk-fake"
import { desktopBridgeOver } from "./desktop-bridge-fakes"
import { fakeMainProcess } from "./fake-main-process"

interface FakeRendererRuntimeOptions {
  readonly spotifyApi?: Layer.Layer<SpotifyApi>
  readonly mainProcess?: DesktopApi
  readonly webPlaybackSdk?: Layer.Layer<WebPlaybackSdk>
}

// The renderer's services over the fake Spotify API and a fake main process,
// for tests that render components. Unless a test gives its own, the Web
// Playback SDK never gets ready, so this computer is not a device.
export const fakeRendererRuntime = ({
  spotifyApi = spotifyApiFake,
  mainProcess = fakeMainProcess(),
  webPlaybackSdk = webPlaybackSdkNeverReady,
}: FakeRendererRuntimeOptions = {}) =>
  ManagedRuntime.make(
    Layer.mergeAll(Player.layer, webPlaybackSdk).pipe(
      Layer.provideMerge(spotifyApi),
      Layer.provideMerge(desktopBridgeOver(mainProcess)),
    ),
  )
