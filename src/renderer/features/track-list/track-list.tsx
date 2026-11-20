import { useVirtualizer } from "@tanstack/react-virtual"
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react"
import { type TrackListEntry, TrackListHeader, TrackRow } from "./track-row"
import { trackRowHeight } from "./track-row-height"
import { useRowFocus } from "./use-row-focus"

// The app shell's main view scrolls the whole page, so whatever sits above
// the list, such as a playlist header, scrolls away with it.
const scrollingMainView = (rowsRef: RefObject<HTMLElement | null>) =>
  rowsRef.current?.closest("main") ?? null

// How far the rows start below the top of the main view's scrolled content,
// which the virtualiser needs to work out which rows are on screen. Only a
// change of width can reflow what sits above the list, so that is when it is
// measured again.
function useRowsOffset(rowsRef: RefObject<HTMLElement | null>, mainViewWidth: number | undefined) {
  const [rowsOffset, setRowsOffset] = useState(0)
  useLayoutEffect(() => {
    const mainView = scrollingMainView(rowsRef)
    if (!rowsRef.current || !mainView || mainViewWidth === undefined) {
      return
    }
    const rowsTop = rowsRef.current.getBoundingClientRect().top
    setRowsOffset(rowsTop - mainView.getBoundingClientRect().top + mainView.scrollTop)
  }, [rowsRef, mainViewWidth])
  return rowsOffset
}

interface TrackListProps {
  readonly label: string
  readonly trackCount: number
  readonly trackAt: (index: number) => TrackListEntry | undefined
  readonly onRowsRendered: (firstIndex: number, lastIndex: number) => void
}

export function TrackList({ label, trackCount, trackAt, onRowsRendered }: TrackListProps) {
  const rowsRef = useRef<HTMLTableSectionElement>(null)
  const [mainViewWidth, setMainViewWidth] = useState<number>()
  const rowsOffset = useRowsOffset(rowsRef, mainViewWidth)
  // oxlint-disable-next-line react/incompatible-library -- The warning is about the React Compiler, which this project does not use.
  const virtualizer = useVirtualizer({
    count: trackCount,
    getScrollElement: () => scrollingMainView(rowsRef),
    estimateSize: () => trackRowHeight,
    overscan: 10,
    scrollMargin: rowsOffset,
    onChange: (instance) => setMainViewWidth(instance.scrollRect?.width),
  })
  const rows = virtualizer.getVirtualItems()
  const firstIndex = rows.at(0)?.index
  const lastIndex = rows.at(-1)?.index
  const rowFocus = useRowFocus({
    rowsRef,
    rowCount: trackCount,
    scrollToIndex: (index) => virtualizer.scrollToIndex(index),
  })

  useEffect(() => {
    if (firstIndex !== undefined && lastIndex !== undefined) {
      onRowsRendered(firstIndex, lastIndex)
    }
  }, [firstIndex, lastIndex, onRowsRendered])

  // The focused row can scroll out of the DOM. The first row on screen then
  // takes its place as the tab stop, so the list stays reachable. Overscan
  // also renders rows above the screen, so the first rendered row would not do.
  const focusedRowIsRendered = rows.some(({ index }) => index === rowFocus.focusedIndex)
  const tabStopIndex = focusedRowIsRendered
    ? rowFocus.focusedIndex
    : (virtualizer.range?.startIndex ?? firstIndex)

  return (
    <div className="@container">
      <table aria-label={label} aria-rowcount={trackCount + 1} className="block">
        <thead className="block">
          <TrackListHeader />
        </thead>
        <tbody
          ref={rowsRef}
          className="relative block"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {rows.map(({ index, start }) => {
            const slot = {
              index,
              tabIndex: index === tabStopIndex ? 0 : -1,
              offset: start - rowsOffset,
              onFocus: () => rowFocus.setFocusedIndex(index),
              onKeyDown: rowFocus.onKeyDown,
            } as const
            return <TrackRow key={index} entry={trackAt(index)} slot={slot} />
          })}
        </tbody>
      </table>
    </div>
  )
}
