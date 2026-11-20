import { Clock, Music } from "lucide-react"
import type { CSSProperties, KeyboardEvent } from "react"
import { Artwork, type ArtworkSource } from "../../ui/artwork"
import { formatTrackDuration } from "./format-duration"
import { trackRowHeight } from "./track-row-height"

export interface TrackListEntry {
  readonly title: string
  readonly artists: string
  readonly album: string
  // Widest first, as Spotify lists image sizes.
  readonly artwork: ReadonlyArray<ArtworkSource>
  readonly addedAt: Date | null
  // Null when Spotify no longer has the track.
  readonly durationMs: number | null
}

// Columns that do not fit are dropped from the right, so the title is never
// squeezed: date added goes first, then the album. Rows are grids rather than
// table rows so that they can be positioned one by one; Chromium keeps their
// table semantics.
const trackColumns =
  "grid grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-4 px-3 @xl:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_4rem] @3xl:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_8rem_4rem]"

const addedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

export function TrackListHeader() {
  return (
    <tr aria-rowindex={1} className={`${trackColumns} h-9 text-left text-xs text-muted`}>
      <th scope="col" className="text-right font-normal">
        #
      </th>
      <th scope="col" className="font-normal">
        Title
      </th>
      <th scope="col" className="hidden font-normal @xl:block">
        Album
      </th>
      <th scope="col" className="hidden font-normal @3xl:block">
        Date added
      </th>
      <th scope="col" aria-label="Duration" className="flex justify-end">
        <Clock aria-hidden size={16} />
      </th>
    </tr>
  )
}

// The place a row takes in the virtualised list: where it sits, whether it is
// the tab stop, and how it reports focus and keys.
interface TrackRowSlot {
  readonly index: number
  readonly tabIndex: 0 | -1
  readonly offset: number
  readonly onFocus: () => void
  readonly onKeyDown: (event: KeyboardEvent) => void
}

const rowAttributes = ({ index, tabIndex, offset, onFocus, onKeyDown }: TrackRowSlot) => ({
  "aria-rowindex": index + 2,
  "data-index": index,
  tabIndex,
  onFocus,
  onKeyDown,
  style: {
    position: "absolute",
    insetInline: 0,
    height: trackRowHeight,
    transform: `translateY(${offset}px)`,
  } satisfies CSSProperties,
  className: `${trackColumns} rounded-small text-sm transition-colors duration-120 ease-out hover:bg-surface-raised focus-visible:bg-surface-raised`,
})

const accessibleName = (index: number, entry: TrackListEntry | undefined) => {
  if (entry === undefined) {
    return `Loading track ${index + 1}`
  }
  return entry.artists === "" ? entry.title : `${entry.title} by ${entry.artists}`
}

function TrackCells({ entry }: { readonly entry: TrackListEntry }) {
  return (
    <>
      <td className="flex min-w-0 items-center gap-3">
        <Artwork
          sources={entry.artwork}
          size={40}
          className="rounded-small"
          placeholderIcon={Music}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{entry.title}</span>
          <span className="truncate text-xs text-muted">{entry.artists}</span>
        </span>
      </td>
      <td className="hidden truncate text-muted @xl:block">{entry.album}</td>
      <td className="hidden text-xs text-muted @3xl:block">
        {entry.addedAt === null ? "" : addedAtFormat.format(entry.addedAt)}
      </td>
      <td className="text-right text-xs text-muted tabular-nums">
        {entry.durationMs === null ? "" : formatTrackDuration(entry.durationMs)}
      </td>
    </>
  )
}

function PlaceholderCells() {
  return (
    <td className="flex items-center gap-3">
      <Artwork sources={[]} size={40} className="rounded-small" placeholderIcon={Music} />
      <span className="h-3 w-2/5 rounded-small bg-surface-raised" />
    </td>
  )
}

interface TrackRowProps {
  // Undefined until the track's page has loaded.
  readonly entry: TrackListEntry | undefined
  readonly slot: TrackRowSlot
}

// A placeholder and the track that replaces it are the same element, so a
// row keeps keyboard focus when its page arrives.
export function TrackRow({ entry, slot }: TrackRowProps) {
  return (
    <tr {...rowAttributes(slot)} aria-label={accessibleName(slot.index, entry)}>
      <td className="text-right text-muted tabular-nums">{slot.index + 1}</td>
      {entry === undefined ? <PlaceholderCells /> : <TrackCells entry={entry} />}
    </tr>
  )
}
