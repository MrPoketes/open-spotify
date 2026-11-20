import { useLayoutEffect, useState } from "react"

// CardGrid's columns are repeat(auto-fill, minmax(160px, 1fr)) with gap-6,
// which fits this many cards on a row of the given width.
const minimumCardWidth = 160
const cardGap = 24

const columnCountFor = (gridWidth: number) =>
  Math.max(1, Math.floor((gridWidth + cardGap) / (minimumCardWidth + cardGap)))

// How many cards fit on one row of a grid. It changes as the pane holding the
// grid is resized.
export function useCardGridColumnCount() {
  const [grid, setGrid] = useState<HTMLElement | null>(null)
  const [columnCount, setColumnCount] = useState(1)

  useLayoutEffect(() => {
    if (grid === null) {
      return undefined
    }
    const measure = () => setColumnCount(columnCountFor(grid.clientWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [grid])

  return { gridRef: setGrid, columnCount }
}
