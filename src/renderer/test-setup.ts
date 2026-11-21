import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import { fakeMediaElementMethods } from "./lib/fake-media-elements"
import { FakeMediaMetadata, fakeMediaSession } from "./lib/fake-media-session"
import { FakeResizeObserver } from "./lib/fake-resize-observer"

// Testing Library only unmounts rendered components by itself when Vitest
// globals are enabled, and they are not.
afterEach(cleanup)

// The router scrolls to the top after each navigation, and jsdom does not
// implement scrolling.
Object.defineProperty(window, "scrollTo", { value: () => undefined })

Object.defineProperty(window, "ResizeObserver", { value: FakeResizeObserver })

Object.defineProperty(navigator, "mediaSession", { value: fakeMediaSession })
Object.defineProperty(window, "MediaMetadata", { value: FakeMediaMetadata })

Object.assign(HTMLMediaElement.prototype, fakeMediaElementMethods)

// jsdom has no modal dialogs. These do the part the app relies on: showing
// the dialog, and firing close when it closes.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    value(this: HTMLDialogElement) {
      this.open = true
    },
  },
  close: {
    value(this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event("close"))
    },
  },
})
