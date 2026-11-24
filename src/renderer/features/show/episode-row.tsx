import { Volume2 } from "lucide-react"
import { useId, useState } from "react"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import type { Episode } from "../spotify/spotify-episode"
import { formatEpisodeDuration } from "./format-episode-duration"
import { formatReleaseDate, formatReleaseDateAttribute } from "./format-release-date"

interface EpisodeRowProps {
  readonly episode: Episode
  // The episode is the one the active device plays or has paused.
  readonly isCurrentItem: boolean
  readonly rovingProps: RovingRowProps
  readonly onPlay: () => void
}

export function EpisodeRow({ episode, isCurrentItem, rovingProps, onPlay }: EpisodeRowProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  const playingTextId = useId()

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the episode is a focusable row of a roving-focus list, and Enter or a double-click plays the focused row, as in track lists (docs/design.md)
    <article
      {...rovingProps}
      aria-labelledby={titleId}
      aria-describedby={isCurrentItem ? playingTextId : undefined}
      onDoubleClick={(event) => {
        // A quick second press on Show more is not a request to play.
        if (event.target instanceof Element && event.target.closest("button") !== null) {
          return
        }
        onPlay()
      }}
      onKeyDown={(event) => {
        // Enter on the Show more button expands the description instead.
        if (event.key === "Enter" && event.target === event.currentTarget) {
          onPlay()
        }
      }}
      className="flex flex-col gap-1 rounded-small p-3 transition-colors duration-120 ease-out hover:bg-surface-raised"
    >
      <h3
        id={titleId}
        className={`flex items-center gap-2 text-sm font-semibold ${isCurrentItem ? "text-accent" : ""}`}
      >
        {isCurrentItem ? <Volume2 aria-hidden size={16} className="shrink-0" /> : null}
        {episode.name}
      </h3>
      {isCurrentItem ? (
        <p id={playingTextId} className="sr-only">
          Playing
        </p>
      ) : null}
      <p className="text-xs text-muted tabular-nums">
        <time dateTime={formatReleaseDateAttribute(episode)}>{formatReleaseDate(episode)}</time>
        <span aria-hidden> · </span>
        {formatEpisodeDuration(episode.durationMs)}
      </p>
      {episode.description !== "" && (
        <>
          <p
            id={descriptionId}
            className={`text-sm text-muted ${descriptionExpanded ? "whitespace-pre-line" : "line-clamp-2"}`}
          >
            {episode.description}
          </p>
          <button
            type="button"
            tabIndex={rovingProps.tabIndex}
            aria-expanded={descriptionExpanded}
            aria-controls={descriptionId}
            aria-describedby={titleId}
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="-mx-1 min-h-6 self-start rounded-small px-1 text-xs font-semibold text-muted transition-colors duration-120 ease-out hover:text-foreground"
          >
            {descriptionExpanded ? "Show less" : "Show more"}
          </button>
        </>
      )}
    </article>
  )
}
