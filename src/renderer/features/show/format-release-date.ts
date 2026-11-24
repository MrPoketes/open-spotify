import type { Episode } from "../spotify/spotify-episode"

// Spotify's dates have no time of day, and Schema.DateFromString reads them as
// UTC midnight. Formatting in UTC keeps the day from moving back west of UTC.
const formatsByPrecision = {
  day: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }),
  month: new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", timeZone: "UTC" }),
  year: new Intl.DateTimeFormat(undefined, { year: "numeric", timeZone: "UTC" }),
}

const isoPrefixLengthByPrecision = {
  day: 10,
  month: 7,
  year: 4,
} as const

export const formatReleaseDate = ({
  releaseDate,
  releaseDatePrecision,
}: Pick<Episode, "releaseDate" | "releaseDatePrecision">) =>
  formatsByPrecision[releaseDatePrecision].format(releaseDate)

export const formatReleaseDateAttribute = ({
  releaseDate,
  releaseDatePrecision,
}: Pick<Episode, "releaseDate" | "releaseDatePrecision">) =>
  releaseDate.toISOString().slice(0, isoPrefixLengthByPrecision[releaseDatePrecision])
