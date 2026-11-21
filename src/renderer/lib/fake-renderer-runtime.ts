import { Layer, ManagedRuntime } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { Player } from "../features/playback/player"
import type { SpotifyApi } from "../features/spotify/spotify-api"
import { spotifyApiFake } from "../features/spotify/spotify-api-fake"
import { desktopBridgeOver } from "./desktop-bridge-fakes"
import { fakeMainProcess } from "./fake-main-process"

interface FakeRendererRuntimeOptions {
  readonly spotifyApi?: Layer.Layer<SpotifyApi>
  readonly mainProcess?: DesktopApi
}

// The renderer's services over the fake Spotify API and a fake main process,
// for tests that render components.
export const fakeRendererRuntime = ({
  spotifyApi = spotifyApiFake,
  mainProcess = fakeMainProcess(),
}: FakeRendererRuntimeOptions = {}) =>
  ManagedRuntime.make(
    Player.layer.pipe(
      Layer.provideMerge(spotifyApi),
      Layer.provideMerge(desktopBridgeOver(mainProcess)),
    ),
  )
