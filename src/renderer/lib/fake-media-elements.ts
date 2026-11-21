// jsdom plays no media, and reports that its media methods are not
// implemented on every call. These keep what each element was last told to
// do, so a test can see the media players the operating system would see:
// elements that have played and still have a source.
const mediaElementStates = new Map<HTMLMediaElement, "playing" | "paused">()

export const fakeMediaElementMethods = {
  play(this: HTMLMediaElement) {
    mediaElementStates.set(this, "playing")
    return Promise.resolve()
  },
  pause(this: HTMLMediaElement) {
    if (mediaElementStates.has(this)) {
      mediaElementStates.set(this, "paused")
    }
  },
  load(this: HTMLMediaElement) {
    mediaElementStates.delete(this)
  },
}

export const mediaPlayerStates = () =>
  [...mediaElementStates]
    .filter(([element]) => element.hasAttribute("src"))
    .map(([, state]) => state)
