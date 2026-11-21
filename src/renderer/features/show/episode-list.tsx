import { Effect } from "effect"
import { useId } from "react"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { useRovingFocus } from "../../ui/use-roving-focus"
import { useScrolledIntoView } from "../../ui/use-scrolled-into-view"
import { useNowPlaying } from "../playback/use-now-playing"
import { usePlayerCommandFromPage } from "../playback/use-player-command-from-page"
import { SpotifyApi } from "../spotify/spotify-api"
import type { Episode } from "../spotify/spotify-episode"
import type { ShowEpisodePage } from "../spotify/spotify-show"
import { useNextPages } from "../spotify/use-next-pages"
import { EpisodeRow } from "./episode-row"

interface EpisodeListProps {
  readonly showId: string
  readonly showUri: string
  readonly firstPage: ShowEpisodePage
}

// Later pages load as the end of the list scrolls into view.
export function EpisodeList({ showId, showUri, firstPage }: EpisodeListProps) {
  const headingId = useId()
  const loadPage = (offset: number) =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      return yield* spotify.getShowEpisodePage(showId, offset)
    })
  const { items, nextOffset, nextPage, loadNextPage } = useNextPages({ firstPage, loadPage })
  const episodes = items.filter((episode) => episode !== null)
  const hasMoreEpisodes = nextOffset !== null
  const { onKeyDown, rowProps } = useRovingFocus(episodes.length)
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
  const scrollEndRef = useScrolledIntoView(loadNextPage, hasMoreEpisodes && nextPage === "idle")

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="font-display text-xl font-bold">
        Episodes
      </h2>
      {episodes.length === 0 && !hasMoreEpisodes && (
        <p className="text-muted">This show has no episodes yet.</p>
      )}
      {episodes.length > 0 && (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused episode, and the list moves focus between its episodes: the roving focus docs/design.md requires for lists
        <ul onKeyDown={onKeyDown} className="flex flex-col">
          {episodes.map((episode, index) => (
            <li key={episode.id}>
              <EpisodeRow
                episode={episode}
                isPlaying={episode.id === playingItemId}
                rovingProps={rowProps(index)}
                onPlay={() => playEpisode(episode)}
              />
            </li>
          ))}
        </ul>
      )}
      {nextPage === "loading" && (
        <output className="text-sm text-muted">Loading more episodes…</output>
      )}
      {nextPage === "failed" && (
        <ErrorWithRetry message="More episodes didn't load." onRetry={loadNextPage} />
      )}
      <div ref={scrollEndRef} />
    </section>
  )
}
