import { act } from "@testing-library/react"

type ResizeCallback = (entries: ReadonlyArray<{ readonly target: Element }>) => void

const observedElements = new Map<ResizeCallback, Set<Element>>()

// jsdom does no layout, so nothing ever resizes on its own, and it has no
// ResizeObserver. This one reports a resize only when a test asks for one.
export class FakeResizeObserver {
  readonly #callback: ResizeCallback
  constructor(callback: ResizeCallback) {
    this.#callback = callback
  }
  observe(element: Element) {
    const elements = observedElements.get(this.#callback) ?? new Set()
    observedElements.set(this.#callback, elements.add(element))
  }
  unobserve(element: Element) {
    observedElements.get(this.#callback)?.delete(element)
  }
  disconnect() {
    observedElements.delete(this.#callback)
  }
}

export const resizeObservedElements = () => {
  act(() => {
    for (const [callback, elements] of observedElements) {
      callback([...elements].map((target) => ({ target })))
    }
  })
}
