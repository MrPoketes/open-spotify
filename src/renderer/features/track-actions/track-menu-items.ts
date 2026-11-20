import type { ContextMenuItem } from "../../ui/context-menu"
import type { SimplifiedArtist } from "../spotify/spotify-artist"
import type { TrackListEntry } from "../track-list/track-row"

export interface TrackActions {
  readonly goToArtist: (artistId: string) => void
  readonly goToAlbum: (albumId: string) => void
  readonly copyLink: (trackId: string) => void
}

// The artists of a local file have no page to go to.
const goToArtistItems = (
  artists: ReadonlyArray<SimplifiedArtist>,
  goToArtist: TrackActions["goToArtist"],
): ReadonlyArray<ContextMenuItem> => {
  const artistItems = artists.flatMap(({ id, name }) =>
    id === null ? [] : [{ label: name, onSelect: () => goToArtist(id) }],
  )
  const [firstArtist, ...otherArtists] = artistItems
  if (firstArtist === undefined) {
    return []
  }
  if (otherArtists.length === 0) {
    return [{ label: "Go to artist", onSelect: firstArtist.onSelect }]
  }
  return [{ label: "Go to artist", items: artistItems }]
}

// Only the actions that lead somewhere: a track on an album page has no
// album to go to, and a local file has no Spotify link.
export function trackMenuItems(
  { trackId, artists, album }: TrackListEntry,
  actions: TrackActions,
): ReadonlyArray<ContextMenuItem> {
  const albumId = album?.id ?? null
  return [
    ...goToArtistItems(artists, actions.goToArtist),
    ...(albumId === null
      ? []
      : [{ label: "Go to album", onSelect: () => actions.goToAlbum(albumId) }]),
    ...(trackId === null
      ? []
      : [{ label: "Copy link", onSelect: () => actions.copyLink(trackId) }]),
  ]
}
