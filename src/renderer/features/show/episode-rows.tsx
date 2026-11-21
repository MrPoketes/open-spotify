import type { Ref } from "react"
import { RovingList } from "../../ui/roving-list"
import type { RowFocusHandle } from "../../ui/use-roving-focus"
import { useNowPlaying } from "../playback/use-now-playing"
import { usePlayerCommandFromPage } from "../playback/use-player-command-from-page"
import type { Episode } from "../spotify/spotify-episode"
import { EpisodeRow } from "./episode-row"

interface EpisodeRowsProps {
  readonly showUri: string
  readonly episodes: ReadonlyArray<Episode>
  readonly rowFocusRef: Ref<RowFocusHandle>
}

export function EpisodeRows({ showUri, episodes, rowFocusRef }: EpisodeRowsProps) {
  const playingItemId = useNowPlaying()?.itemId ?? null
  const sendCommand = usePlayerCommandFromPage()
  // Spotify documents offsets only for albums and playlists. A show starts at
  // the episode's uri rather than its position, which a newly published
  // episode would shift.
  const playEpisode = (episode: Episode) =>
    sendCommand(
      (player) => player.startPlayback({ contextUri: showUri, offset: { uri: episode.uri } }),
      "Couldn't play this episode.",
    )

  return (
    <RovingList
      rowFocusRef={rowFocusRef}
      rows={episodes}
      rowKey={(episode) => episode.id}
      className="flex flex-col"
      renderRow={(episode, rovingProps) => (
        <EpisodeRow
          episode={episode}
          isCurrentItem={episode.id === playingItemId}
          rovingProps={rovingProps}
          onPlay={() => playEpisode(episode)}
        />
      )}
    />
  )
}
