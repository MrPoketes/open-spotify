import { userEvent } from "@testing-library/user-event"
import { vi } from "vitest"

const rowHeight = 48
const treeRowSelector = '[role="tree"] > [role="none"]'

const treeRows = () => [...document.querySelectorAll(treeRowSelector)]

// The top of the row that holds an element, or of the row itself.
const rowTop = (element: Element) =>
  treeRows().findIndex((row) => row.contains(element)) * rowHeight

// jsdom does no layout, so a test lays the rows of a tree out one below the
// other, each 48 px tall. Everything else takes no space.
export const layOutTreeRows = () =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const isRow = treeRows().includes(this)
    const top = isRow ? rowTop(this) : 0
    const height = isRow ? rowHeight : 0
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      right: 300,
      bottom: top + height,
      width: 300,
      height,
      toJSON: () => ({}),
    }
  })

// A point on an item's row: a fraction of 0.1 is near its top edge, 0.5 its
// middle, and 0.9 its bottom edge.
const pointOnRow = (item: HTMLElement, fraction: number) => ({
  clientX: 100,
  clientY: rowTop(item) + fraction * rowHeight,
})

// The pointer moves that drag a tree item over a point on another item's row.
const dragMoves = (item: HTMLElement, target: HTMLElement, fraction: number) => {
  const start = pointOnRow(item, 0.5)
  return [
    { keys: "[MouseLeft>]", target: item, coords: start },
    // The first move only starts the drag, so the second one finds the row
    // under the pointer.
    { coords: { ...start, clientX: start.clientX + 10 } },
    { coords: pointOnRow(target, fraction) },
  ]
}

// Keeps the button down, as when a drag rests on a row, until the test lets
// go with the returned release. The drag can move on to other rows first.
export const dragTreeItemOver = async (
  item: HTMLElement,
  target: HTMLElement,
  fraction: number,
) => {
  const user = userEvent.setup()
  await user.pointer(dragMoves(item, target, fraction))
  return {
    moveOver: (nextTarget: HTMLElement, nextFraction: number) =>
      user.pointer({ coords: pointOnRow(nextTarget, nextFraction) }),
    release: () => user.pointer({ keys: "[/MouseLeft]" }),
  }
}

export const dragTreeItemOnto = async (
  item: HTMLElement,
  target: HTMLElement,
  fraction: number,
) => {
  const drag = await dragTreeItemOver(item, target, fraction)
  await drag.release()
}
