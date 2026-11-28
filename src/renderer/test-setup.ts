import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach } from "vitest"
import { fakeMediaElementMethods } from "./lib/fake-media-elements"
import { FakeMediaMetadata, fakeMediaSession } from "./lib/fake-media-session"
import { FakeResizeObserver } from "./lib/fake-resize-observer"

// Testing Library only unmounts rendered components by itself when Vitest
// globals are enabled, and they are not.
afterEach(cleanup)

// A hidden element's text is never on screen. It is there only to describe a
// control to screen readers, such as why a playback control is off, so text
// queries skip it as a user's eyes would.
configure({ defaultIgnore: "script, style, [hidden]" })

// The router scrolls to the top after each navigation, and jsdom does not
// implement scrolling.
Object.defineProperty(window, "scrollTo", { value: () => undefined })

Object.defineProperty(window, "ResizeObserver", { value: FakeResizeObserver })

Object.defineProperty(navigator, "mediaSession", { value: fakeMediaSession })
Object.defineProperty(window, "MediaMetadata", { value: FakeMediaMetadata })

Object.assign(HTMLMediaElement.prototype, fakeMediaElementMethods)

// jsdom has no pointer capture, and Base UI's slider asks whether its control
// holds the pointer when a drag ends. The tests never capture one.
Object.defineProperty(Element.prototype, "hasPointerCapture", { value: () => false })
