import { useId, useState } from "react"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import type { Episode } from "../spotify/spotify-episode"
import { formatEpisodeDuration } from "./format-episode-duration"
import { formatReleaseDate } from "./format-release-date"

interface EpisodeRowProps {
  readonly episode: Episode
  readonly rovingProps: RovingRowProps
}

export function EpisodeRow({ episode, rovingProps }: EpisodeRowProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  return (
    <article
      {...rovingProps}
      aria-labelledby={titleId}
      className="flex flex-col gap-1 rounded-small p-3 transition-colors duration-120 ease-out hover:bg-surface-raised"
    >
      <h3 id={titleId} className="text-sm font-semibold">
        {episode.name}
      </h3>
      <p className="text-xs text-muted tabular-nums">
        <time dateTime={episode.releaseDate}>{formatReleaseDate(episode)}</time>
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
