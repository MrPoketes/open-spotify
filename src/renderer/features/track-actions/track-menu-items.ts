import type { MenuItem } from "../../ui/menu-items"
import type { FolderItemSource } from "../folders/use-add-to-folder"
import type { SimplifiedArtist } from "../spotify/spotify-artist"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"
import type { TrackListEntry } from "../track-list/track-row"
import type { EditablePlaylists } from "./editable-playlists"

export interface TrackActions {
  readonly addToPlaylist: (trackUri: string, playlist: SimplifiedPlaylist) => void
  readonly explainMissingPlaylists: () => void
  readonly addToQueue: (trackUri: string) => void
  readonly goToArtist: (artistId: string) => void
  readonly goToAlbum: (albumId: string) => void
  readonly copyLink: (trackId: string) => void
}

// What the menu needs from outside the track: the playlists it can go into,
// and the Add to folder item, which the folders feature builds.
interface TrackMenuSources {
  readonly editablePlaylists: EditablePlaylists["state"]
  readonly addToFolder: (source: FolderItemSource) => MenuItem
}

// Until the playlists load, or when there are none to add to, the item says
// why instead of opening an empty submenu.
const addToPlaylistItem = (
  trackUri: string,
  editablePlaylists: EditablePlaylists["state"],
  actions: TrackActions,
): MenuItem => {
  if (editablePlaylists.status !== "loaded" || editablePlaylists.value.length === 0) {
    return { label: "Add to playlist", onSelect: actions.explainMissingPlaylists }
  }
  return {
    label: "Add to playlist",
    items: editablePlaylists.value.map((playlist) => ({
      id: playlist.id,
      label: playlist.name,
      onSelect: () => actions.addToPlaylist(trackUri, playlist),
    })),
  }
}

// The artists of a local file have no page to go to.
const goToArtistItems = (
  artists: ReadonlyArray<SimplifiedArtist>,
  goToArtist: TrackActions["goToArtist"],
): ReadonlyArray<MenuItem> => {
  const artistItems = artists.flatMap(({ id, name }) =>
    id === null ? [] : [{ id, label: name, onSelect: () => goToArtist(id) }],
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

// Only a Spotify track can be added to a playlist, a folder, or the queue.
const addTrackItems = (
  { trackId, title, artwork }: TrackListEntry,
  actions: TrackActions,
  sources: TrackMenuSources,
): ReadonlyArray<MenuItem> => {
  if (trackId === null) {
    return []
  }
  const trackUri = `spotify:track:${trackId}`
  return [
    addToPlaylistItem(trackUri, sources.editablePlaylists, actions),
    sources.addToFolder({ uri: trackUri, name: title, images: artwork }),
    { label: "Add to queue", onSelect: () => actions.addToQueue(trackUri) },
  ]
}

// Only the actions that lead somewhere: a track on an album page has no
// album to go to, and a local file has no Spotify link.
export function trackMenuItems(
  entry: TrackListEntry,
  actions: TrackActions,
  sources: TrackMenuSources,
): ReadonlyArray<MenuItem> {
  const { trackId, artists, album } = entry
  const albumId = album?.id ?? null
  return [
    ...addTrackItems(entry, actions, sources),
    ...goToArtistItems(artists, actions.goToArtist),
    ...(albumId === null
      ? []
      : [{ label: "Go to album", onSelect: () => actions.goToAlbum(albumId) }]),
    ...(trackId === null
      ? []
      : [{ label: "Copy link", onSelect: () => actions.copyLink(trackId) }]),
  ]
}
