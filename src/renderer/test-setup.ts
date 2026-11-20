import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import { FakeResizeObserver } from "./lib/fake-resize-observer"

// Testing Library only unmounts rendered components by itself when Vitest
// globals are enabled, and they are not.
afterEach(cleanup)

// The router scrolls to the top after each navigation, and jsdom does not
// implement scrolling.
Object.defineProperty(window, "scrollTo", { value: () => undefined })

Object.defineProperty(window, "ResizeObserver", { value: FakeResizeObserver })
