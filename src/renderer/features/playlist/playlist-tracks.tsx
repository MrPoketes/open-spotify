import { Effect } from "effect"
import { useCallback } from "react"
import { SpotifyApi } from "../spotify/spotify-api"
import { maximumPageSize } from "../spotify/spotify-paging"
import type { Playlist, PlaylistItem, PlaylistItemsPage } from "../spotify/spotify-playlist"
import { formatListDuration } from "../track-list/format-duration"
import { PageFailedAlert } from "../track-list/page-failed-alert"
import { TrackList } from "../track-list/track-list"
import { usePagedItems } from "../track-list/use-paged-items"
import { PlaylistHeader } from "./playlist-header"
import { playlistTrackEntry } from "./playlist-track-entry"

// A removed track counts as loaded, with no length.
const loadedDurationsMs = (items: ReadonlyArray<PlaylistItem | undefined>) =>
  items.filter((item) => item !== undefined).map(({ item }) => item?.durationMs ?? 0)

const loadItemsPage = Effect.fn("loadItemsPage")(function* (playlistId: string, offset: number) {
  const spotify = yield* SpotifyApi
  const page = yield* spotify.getPlaylistItemsPage(playlistId, offset)
  return page.items
})

interface PlaylistTracksProps {
  readonly playlist: Playlist
  readonly firstPage: PlaylistItemsPage
}

export function PlaylistTracks({ playlist, firstPage }: PlaylistTracksProps) {
  const playlistId = playlist.id
  const loadPage = useCallback((offset: number) => loadItemsPage(playlistId, offset), [playlistId])
  const tracks = usePagedItems({ firstPage: firstPage.items, pageSize: maximumPageSize, loadPage })

  const trackAt = (index: number) => {
    const playlistItem = tracks.items[index]
    return playlistItem === undefined ? undefined : playlistTrackEntry(playlistItem)
  }

  return (
    <div className="flex flex-col gap-8">
      <PlaylistHeader
        playlist={playlist}
        totalDuration={formatListDuration(loadedDurationsMs(tracks.items), firstPage.total)}
      />
      <TrackList
        label="Tracks"
        layout="playlist"
        trackCount={firstPage.total}
        trackAt={trackAt}
        onRowsRendered={tracks.loadRange}
      />
      {tracks.pageFailed ? <PageFailedAlert onRetry={tracks.retry} /> : null}
    </div>
  )
}
