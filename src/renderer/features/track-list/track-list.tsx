import { useVirtualizer } from "@tanstack/react-virtual"
import {
  type Ref,
  type RefObject,
  use,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import type { RowFocusHandle } from "../../ui/use-roving-focus"
import type { PlaybackStart } from "../spotify/spotify-player-requests"
import { type TrackListEntry, TrackListHeader, type TrackListLayout, TrackRow } from "./track-row"
import { TrackListDensityContext } from "./track-list-density-context"
import { trackRowHeight } from "./track-row-height"
import { useRowFocus } from "./use-row-focus"
import { useTrackPlayback } from "./use-track-playback"

// The app shell's main view scrolls the whole page, so whatever sits above
// the list, such as a playlist header, scrolls away with it.
const scrollingMainView = (rowsRef: RefObject<HTMLElement | null>) =>
  rowsRef.current?.closest("main") ?? null

// How far the rows start below the top of the main view's scrolled content,
// which the virtualiser needs to work out which rows are on screen. What sits
// above the list can change height, such as a header that reflows at a new
// width or a home page section that finishes loading, so the offset is
// measured again whenever the page resizes.
function useRowsOffset(rowsRef: RefObject<HTMLElement | null>) {
  const [rowsOffset, setRowsOffset] = useState(0)
  useLayoutEffect(() => {
    const rows = rowsRef.current
    const mainView = scrollingMainView(rowsRef)
    // Every route renders a single root element inside <main>, so its first
    // child is the whole page.
    const page = mainView?.firstElementChild
    if (!rows || !mainView || !page) {
      return undefined
    }
    const measure = () =>
      setRowsOffset(
        rows.getBoundingClientRect().top -
          mainView.getBoundingClientRect().top +
          mainView.scrollTop,
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(page)
    return () => observer.disconnect()
  }, [rowsRef])
  return rowsOffset
}

interface TrackListProps {
  readonly label: string
  readonly layout: TrackListLayout
  readonly trackCount: number
  readonly trackAt: (index: number) => TrackListEntry | undefined
  // What plays when the track at the index is played: its album, playlist,
  // or list, starting at it.
  readonly playbackStartAt: (index: number) => PlaybackStart
  // For lists that load their tracks as they scroll into view.
  readonly onRowsRendered?: (firstIndex: number, lastIndex: number) => void
  // A track the list highlights and opens scrolled to and focused, such as a
  // track opened on its album page.
  readonly highlightedIndex?: number | undefined
  readonly rowFocusRef?: Ref<RowFocusHandle> | undefined
}

export function TrackList({
  label,
  layout,
  trackCount,
  trackAt,
  playbackStartAt,
  onRowsRendered,
  highlightedIndex,
  rowFocusRef,
}: TrackListProps) {
  const { density } = use(TrackListDensityContext)
  const playback = useTrackPlayback(playbackStartAt)
  const rowsRef = useRef<HTMLTableSectionElement>(null)
  const rowsOffset = useRowsOffset(rowsRef)
  // oxlint-disable-next-line react/incompatible-library -- The warning is about the React Compiler, which this project does not use.
  const virtualizer = useVirtualizer({
    count: trackCount,
    getScrollElement: () => scrollingMainView(rowsRef),
    estimateSize: () => trackRowHeight[density],
    overscan: 10,
    scrollMargin: rowsOffset,
  })
  // The virtualiser keeps the row sizes it worked out and does not notice a
  // new estimate, so a change of density must make it start over.
  useLayoutEffect(() => virtualizer.measure(), [virtualizer, density])
  const rows = virtualizer.getVirtualItems()
  const firstIndex = rows.at(0)?.index
  const lastIndex = rows.at(-1)?.index
  const rowFocus = useRowFocus({
    rowsRef,
    rowCount: trackCount,
    initialFocusedIndex: highlightedIndex,
    scrollToIndex: (index) => virtualizer.scrollToIndex(index),
  })
  useImperativeHandle(rowFocusRef, () => ({ focusRow: rowFocus.focusRow }))

  // The highlighted row is not in the DOM until the list scrolls to it. The
  // virtualiser keeps aiming at the row while the offset of the rows settles.
  useLayoutEffect(() => {
    if (highlightedIndex !== undefined) {
      virtualizer.scrollToIndex(highlightedIndex, { align: "center" })
    }
  }, [virtualizer, highlightedIndex])

  useEffect(() => {
    if (firstIndex !== undefined && lastIndex !== undefined) {
      onRowsRendered?.(firstIndex, lastIndex)
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
          <TrackListHeader layout={layout} />
        </thead>
        <tbody
          ref={rowsRef}
          className="relative block"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {rows.map(({ index, start }) => {
            const entry = trackAt(index)
            const slot = {
              index,
              tabIndex: index === tabStopIndex ? 0 : -1,
              isHighlighted: index === highlightedIndex,
              isCurrentItem: playback.isCurrentItem(entry),
              offset: start - rowsOffset,
              onFocus: () => rowFocus.setFocusedIndex(index),
              onKeyDown: rowFocus.onKeyDown,
              onPlay: () => playback.play(index),
            } as const
            return (
              <TrackRow key={index} entry={entry} layout={layout} density={density} slot={slot} />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
