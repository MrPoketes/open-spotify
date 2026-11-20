import { Effect } from "effect"
import { SpotifyApi, maximumPageSize } from "../spotify/spotify-api"
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
        trackCount={firstPage.total}
        trackAt={trackAt}
        onRowsRendered={songs.loadRange}
      />
      {songs.pageFailed ? <PageFailedAlert onRetry={songs.retry} /> : null}
    </div>
  )
}
