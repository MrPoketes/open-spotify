import { act } from "@testing-library/react"
import { vi } from "vitest"

type IntersectionCallback = (entries: ReadonlyArray<{ readonly isIntersecting: boolean }>) => void

// jsdom has no IntersectionObserver. This one reports that the observed
// elements are visible only when a test scrolls to them.
const intersectionCallbacks = new Set<IntersectionCallback>()

class FakeIntersectionObserver {
  readonly #callback: IntersectionCallback
  constructor(callback: IntersectionCallback) {
    this.#callback = callback
  }
  observe() {
    intersectionCallbacks.add(this.#callback)
  }
  disconnect() {
    intersectionCallbacks.delete(this.#callback)
  }
}

// Call before each test.
export const installFakeIntersectionObserver = () => {
  intersectionCallbacks.clear()
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
}

export const scrollObservedElementsIntoView = () => {
  act(() => {
    for (const callback of intersectionCallbacks) {
      callback([{ isIntersecting: true }])
    }
  })
}
