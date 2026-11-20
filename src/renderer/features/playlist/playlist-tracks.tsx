import { Effect } from "effect"
import { useCallback } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { SpotifyApi, maximumPageSize } from "../spotify/spotify-api"
import type { Playlist, PlaylistItem, PlaylistItemsPage } from "../spotify/spotify-playlist"
import { formatTotalDuration } from "../track-list/format-duration"
import { TrackList } from "../track-list/track-list"
import { usePagedItems } from "../track-list/use-paged-items"
import { PlaylistHeader } from "./playlist-header"
import { playlistTrackEntry } from "./playlist-track-entry"

const totalDurationText = (items: ReadonlyArray<PlaylistItem | undefined>, trackCount: number) => {
  const loadedItems = items.filter((item) => item !== undefined)
  let loadedMs = 0
  for (const { item } of loadedItems) {
    loadedMs += item?.durationMs ?? 0
  }
  if (loadedItems.length === trackCount) {
    return formatTotalDuration(loadedMs)
  }
  // Spotify does not report a playlist's length, and loading every page of a
  // long playlist up front would be slow, so the rest is estimated.
  return `about ${formatTotalDuration((loadedMs / loadedItems.length) * trackCount)}`
}

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
        totalDuration={totalDurationText(tracks.items, firstPage.total)}
      />
      <TrackList
        label="Tracks"
        trackCount={firstPage.total}
        trackAt={trackAt}
        onRowsRendered={tracks.loadRange}
      />
      {/* Below the list and stuck to the bottom of the view, so it shows
          wherever the user has scrolled without moving any row. */}
      {tracks.pageFailed ? (
        <div className="sticky bottom-0 bg-surface py-2">
          <ErrorWithRetry message="Some tracks didn't load." onRetry={tracks.retry} />
        </div>
      ) : null}
    </div>
  )
}
