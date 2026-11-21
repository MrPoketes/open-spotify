import { act } from "@testing-library/react"

// jsdom has no Media Session API. This one keeps what the page sets, so a test
// can read what the operating system would show and press its media keys.
class FakeMediaSession {
  metadata: MediaMetadata | null = null
  playbackState: MediaSessionPlaybackState = "none"
  readonly #handlers = new Map<MediaSessionAction, MediaSessionActionHandler>()

  setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
    if (handler === null) {
      this.#handlers.delete(action)
      return
    }
    this.#handlers.set(action, handler)
  }

  press(action: MediaSessionAction) {
    act(() => this.#handlers.get(action)?.({ action }))
  }
}

export class FakeMediaMetadata {
  readonly title: string
  readonly artist: string
  readonly album: string
  readonly artwork: ReadonlyArray<MediaImage>
  constructor({ title = "", artist = "", album = "", artwork = [] }: MediaMetadataInit = {}) {
    this.title = title
    this.artist = artist
    this.album = album
    this.artwork = artwork
  }
}

export const fakeMediaSession = new FakeMediaSession()
