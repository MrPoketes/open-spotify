import { Link } from "@tanstack/react-router"
import { Clock, Music, Volume2 } from "lucide-react"
import { type CSSProperties, type KeyboardEvent, useId } from "react"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { Artwork, type ArtworkSource } from "../../ui/artwork"
import { ContextMenu } from "../../ui/context-menu"
import { useContextMenu } from "../../ui/use-context-menu"
import { ArtistLinks } from "../artist/artist-links"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { SimplifiedArtist } from "../spotify/spotify-artist"
import { useEditablePlaylists } from "../track-actions/editable-playlists"
import { trackMenuItems } from "../track-actions/track-menu-items"
import { useTrackActions } from "../track-actions/use-track-actions"
import { formatTrackDuration } from "./format-duration"
import { trackRowHeight } from "./track-row-height"

// Every track on an album shares its artwork and album, and an album has no
// date added, so its list leaves those out. Tracks that are not in a list,
// such as search results or the home page's recently played and top tracks,
// have no date added either.
export type TrackListLayout = "playlist" | "album" | "undated"

const showsAlbum = (layout: TrackListLayout) => layout !== "album"

const showsDateAdded = (layout: TrackListLayout) => layout === "playlist"

export interface TrackListEntry {
  // Null for a row that is not a Spotify track: a podcast episode, a local
  // file, or a track Spotify no longer has.
  readonly trackId: string | null
  readonly title: string
  // Empty for a row without artists, such as a podcast episode.
  readonly artists: ReadonlyArray<SimplifiedArtist>
  // Null when the row has no album to show, such as a podcast episode or a
  // track on an album page. Local files have no id.
  readonly album: { readonly id: string | null; readonly name: string } | null
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
const columnsByLayout: Record<TrackListLayout, string> = {
  playlist:
    "grid-cols-[2rem_minmax(0,1fr)_4rem] @xl:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_4rem] @3xl:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_8rem_4rem]",
  album: "grid-cols-[2rem_minmax(0,1fr)_4rem]",
  undated:
    "grid-cols-[2rem_minmax(0,1fr)_4rem] @xl:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_4rem]",
}

const trackColumns = (layout: TrackListLayout) =>
  `grid items-center gap-4 px-3 ${columnsByLayout[layout]}`

// Album rows would repeat the album's cover, and dense rows are too short for
// artwork.
const showsArtwork = (layout: TrackListLayout, density: TrackListDensity) =>
  showsAlbum(layout) && density === "comfortable"

// A dense row has room for one line, so the artists follow the title on it.
const titleLinesByDensity: Record<TrackListDensity, string> = {
  comfortable: "flex min-w-0 flex-col",
  dense: "flex min-w-0 items-baseline gap-2",
}

const addedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

export function TrackListHeader({ layout }: { readonly layout: TrackListLayout }) {
  return (
    <tr aria-rowindex={1} className={`${trackColumns(layout)} h-9 text-left text-xs text-muted`}>
      <th scope="col" className="text-right font-normal">
        #
      </th>
      <th scope="col" className="font-normal">
        Title
      </th>
      {showsAlbum(layout) ? (
        <th scope="col" className="hidden font-normal @xl:block">
          Album
        </th>
      ) : null}
      {showsDateAdded(layout) ? (
        <th scope="col" className="hidden font-normal @3xl:block">
          Date added
        </th>
      ) : null}
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
  readonly isHighlighted: boolean
  // The row holds the track that the active device plays or has paused.
  readonly isCurrentItem: boolean
  readonly offset: number
  readonly onFocus: () => void
  readonly onKeyDown: (event: KeyboardEvent) => void
  readonly onPlay: () => void
}

const rowAttributes = (
  { index, tabIndex, isHighlighted, offset, onFocus }: TrackRowSlot,
  layout: TrackListLayout,
  density: TrackListDensity,
) => ({
  "aria-rowindex": index + 2,
  "data-index": index,
  "aria-current": isHighlighted ? ("true" as const) : undefined,
  tabIndex,
  onFocus,
  style: {
    position: "absolute",
    insetInline: 0,
    height: trackRowHeight[density],
    transform: `translateY(${offset}px)`,
  } satisfies CSSProperties,
  // The highlight is also bold, so it does not rest on color alone.
  className: `${trackColumns(layout)} rounded-small text-sm transition-colors duration-120 ease-out hover:bg-surface-raised focus-visible:bg-surface-raised ${isHighlighted ? "bg-surface-raised font-semibold" : ""}`,
})

const accessibleName = (index: number, entry: TrackListEntry | undefined) => {
  if (entry === undefined) {
    return `Loading track ${index + 1}`
  }
  return entry.artists.length === 0
    ? entry.title
    : `${entry.title} by ${formatArtistNames(entry.artists)}`
}

interface AlbumCellProps {
  readonly album: TrackListEntry["album"]
  // Only the row that is the list's tab stop puts its link in the tab order.
  readonly tabIndex: 0 | -1
}

function AlbumCell({ album, tabIndex }: AlbumCellProps) {
  const cellClassName = "hidden truncate text-muted @xl:block"
  if (album === null || album.id === null) {
    return <td className={cellClassName}>{album?.name}</td>
  }
  return (
    <td className={cellClassName}>
      <Link
        to="/album/$albumId"
        params={{ albumId: album.id }}
        tabIndex={tabIndex}
        className="transition-colors duration-120 ease-out hover:text-foreground hover:underline"
      >
        {album.name}
      </Link>
    </td>
  )
}

interface PositionCellProps {
  readonly index: number
  readonly isCurrentItem: boolean
  // The row's aria-label replaces its contents, so the row is described by
  // the "Playing" text instead.
  readonly playingTextId: string
}

// The playing row shows an icon in place of its number and its title in the
// accent color, so it does not rest on color alone.
function PositionCell({ index, isCurrentItem, playingTextId }: PositionCellProps) {
  if (!isCurrentItem) {
    return <td className="text-right text-muted tabular-nums">{index + 1}</td>
  }
  return (
    <td className="flex justify-end text-accent">
      <Volume2 aria-hidden size={16} />
      <span id={playingTextId} className="sr-only">
        Playing
      </span>
    </td>
  )
}

interface TrackCellsProps {
  readonly entry: TrackListEntry
  readonly layout: TrackListLayout
  readonly density: TrackListDensity
  readonly slot: TrackRowSlot
}

function TrackCells({
  entry,
  layout,
  density,
  slot: { tabIndex, isCurrentItem },
}: TrackCellsProps) {
  return (
    <>
      <td className="flex min-w-0 items-center gap-3">
        {showsArtwork(layout, density) ? (
          <Artwork
            sources={entry.artwork}
            size={40}
            className="rounded-small"
            placeholderIcon={Music}
          />
        ) : null}
        <span className={titleLinesByDensity[density]}>
          <span className={`truncate ${isCurrentItem ? "text-accent" : ""}`}>{entry.title}</span>
          <span className="truncate text-xs text-muted">
            <ArtistLinks artists={entry.artists} tabIndex={tabIndex} />
          </span>
        </span>
      </td>
      {showsAlbum(layout) ? <AlbumCell album={entry.album} tabIndex={tabIndex} /> : null}
      {showsDateAdded(layout) ? (
        <td className="hidden text-xs text-muted @3xl:block">
          {entry.addedAt === null ? "" : addedAtFormat.format(entry.addedAt)}
        </td>
      ) : null}
      <td className="text-right text-xs text-muted tabular-nums">
        {entry.durationMs === null ? "" : formatTrackDuration(entry.durationMs)}
      </td>
    </>
  )
}

interface PlaceholderCellsProps {
  readonly layout: TrackListLayout
  readonly density: TrackListDensity
}

function PlaceholderCells({ layout, density }: PlaceholderCellsProps) {
  return (
    <td className="flex items-center gap-3">
      {showsArtwork(layout, density) ? (
        <Artwork sources={[]} size={40} className="rounded-small" placeholderIcon={Music} />
      ) : null}
      <span className="h-3 w-2/5 rounded-small bg-surface-raised" />
    </td>
  )
}

interface TrackRowProps {
  // Undefined until the track's page has loaded.
  readonly entry: TrackListEntry | undefined
  readonly layout: TrackListLayout
  readonly density: TrackListDensity
  readonly slot: TrackRowSlot
}

// A placeholder and the track that replaces it are the same element, so a
// row keeps keyboard focus when its page arrives. Each disc of an album is
// its own list, so a row's position is also its track number.
export function TrackRow({ entry, layout, density, slot }: TrackRowProps) {
  const trackMenu = useContextMenu()
  const trackActions = useTrackActions()
  const editablePlaylists = useEditablePlaylists()
  const playingTextId = useId()
  // A row that is still loading has no actions yet, and a row whose actions
  // would all lead nowhere, such as a local file's, opens no menu.
  const menuItems =
    entry === undefined ? [] : trackMenuItems(entry, trackActions, editablePlaylists.state)
  const opensMenu = menuItems.length > 0

  return (
    <tr
      {...rowAttributes(slot, layout, density)}
      aria-label={accessibleName(slot.index, entry)}
      aria-describedby={slot.isCurrentItem ? playingTextId : undefined}
      onContextMenu={opensMenu ? trackMenu.openAtPointer : undefined}
      onDoubleClick={entry === undefined ? undefined : slot.onPlay}
      onKeyDown={(event) => {
        if (opensMenu) {
          trackMenu.openWithKeyboard(event)
        }
        // Enter on a link in the row follows the link instead.
        if (event.key === "Enter" && event.target === event.currentTarget && entry !== undefined) {
          slot.onPlay()
        }
        slot.onKeyDown(event)
      }}
    >
      <PositionCell
        index={slot.index}
        isCurrentItem={slot.isCurrentItem}
        playingTextId={playingTextId}
      />
      {entry === undefined ? (
        <PlaceholderCells layout={layout} density={density} />
      ) : (
        <TrackCells entry={entry} layout={layout} density={density} slot={slot} />
      )}
      {entry !== undefined && opensMenu && trackMenu.anchor !== null ? (
        <ContextMenu
          label={`Actions for ${entry.title}`}
          items={menuItems}
          anchor={trackMenu.anchor}
          onClose={trackMenu.close}
        />
      ) : null}
    </tr>
  )
}
