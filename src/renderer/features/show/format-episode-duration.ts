import { formatTotalDuration } from "../track-list/format-duration"

const millisecondsPerMinute = 60_000

// Episode lengths show in whole minutes, and even the shortest shows as 1 min.
export const formatEpisodeDuration = (durationMs: number) =>
  formatTotalDuration(
    Math.max(1, Math.round(durationMs / millisecondsPerMinute)) * millisecondsPerMinute,
  )
