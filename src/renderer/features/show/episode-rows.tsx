import { type Ref, useImperativeHandle } from "react"
import { type RowFocusHandle, useRovingFocus } from "../../ui/use-roving-focus"
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
  const { onKeyDown, rowProps, focusRow } = useRovingFocus(episodes.length)
  useImperativeHandle(rowFocusRef, () => ({ focusRow }), [focusRow])
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
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused episode, and the list moves focus between its episodes: the roving focus docs/design.md requires for lists
    <ul onKeyDown={onKeyDown} className="flex flex-col">
      {episodes.map((episode, index) => (
        <li key={episode.id}>
          <EpisodeRow
            episode={episode}
            isCurrentItem={episode.id === playingItemId}
            rovingProps={rowProps(index)}
            onPlay={() => playEpisode(episode)}
          />
        </li>
      ))}
    </ul>
  )
}
