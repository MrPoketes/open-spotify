import type { Layer } from "effect"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import type { SpotifyApi } from "../spotify/spotify-api"
import { NowPlayingBar } from "./now-playing-bar"

// The bar with the queue and the device picker closed, for tests of the
// playback it controls.
export const nowPlayingBarAlone = (
  <NowPlayingBar
    isQueueOpen={false}
    onQueueToggle={() => undefined}
    queueButtonRef={{ current: null }}
    isDevicePickerOpen={false}
    onDevicePickerOpenChange={() => undefined}
  />
)

export const renderNowPlayingBarAlone = (spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(nowPlayingBarAlone, fakeMainProcess(), spotifyApi)
