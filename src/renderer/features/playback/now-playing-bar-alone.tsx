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
