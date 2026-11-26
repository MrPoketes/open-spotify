import { Effect } from "effect"
import { maximumPageSize, SpotifyApi } from "../spotify/spotify-api"
import type { PlaybackStart } from "../spotify/spotify-player-requests"
import type { SavedTrack, SavedTracksPage } from "../spotify/spotify-track"
import { formatListDuration } from "../track-list/format-duration"
import { PageFailedAlert } from "../track-list/page-failed-alert"
import { trackEntry } from "../track-list/track-entry"
import { TrackList } from "../track-list/track-list"
import { usePagedItems } from "../track-list/use-paged-items"
import { LikedSongsHeader } from "./liked-songs-header"

const loadLikedSongsPage = Effect.fn("loadLikedSongsPage")(function* (offset: number) {
  const spotify = yield* SpotifyApi
  const page = yield* spotify.getLikedSongsPage(offset)
  return page.items
})

const loadedDurationsMs = (songs: ReadonlyArray<SavedTrack | undefined>) =>
  songs.filter((song) => song !== undefined).map(({ track }) => track.durationMs)

// Liked Songs has no context URI that the API accepts, so the songs that have
// loaded play as a list, from the one at the index on.
const likedSongsPlaybackAt = (
  songs: ReadonlyArray<SavedTrack | undefined>,
  index: number,
): PlaybackStart => {
  const loadedBefore = songs.slice(0, index).filter((song) => song !== undefined)
  const uris = songs.filter((song) => song !== undefined).map(({ track }) => track.uri)
  return { uris, offset: { position: loadedBefore.length } }
}

export function LikedSongsTracks({ firstPage }: { readonly firstPage: SavedTracksPage }) {
  const songs = usePagedItems({
    firstPage: firstPage.items,
    pageSize: maximumPageSize,
    loadPage: loadLikedSongsPage,
  })

  const trackAt = (index: number) => {
    const song = songs.items[index]
    return song === undefined ? undefined : trackEntry(song.track, song.addedAt)
  }

  return (
    <div className="flex flex-col gap-8">
      <LikedSongsHeader
        songCount={firstPage.total}
        totalDuration={formatListDuration(loadedDurationsMs(songs.items), firstPage.total)}
      />
      <TrackList
        label="Liked Songs"
        layout="playlist"
        trackCount={firstPage.total}
        trackAt={trackAt}
        playbackStartAt={(index) => likedSongsPlaybackAt(songs.items, index)}
        onRowsRendered={songs.loadRange}
      />
      {songs.pageError !== null ? (
        <PageFailedAlert error={songs.pageError} onRetry={songs.retry} />
      ) : null}
    </div>
  )
}
