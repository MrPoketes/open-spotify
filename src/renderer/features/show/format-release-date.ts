import type { Episode } from "../spotify/spotify-episode"

// Spotify's dates have no time of day, and `new Date` reads them as UTC
// midnight. Formatting in UTC keeps the day from moving back west of UTC.
const formatsByPrecision = {
  day: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }),
  month: new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", timeZone: "UTC" }),
  year: new Intl.DateTimeFormat(undefined, { year: "numeric", timeZone: "UTC" }),
}

export const formatReleaseDate = ({
  releaseDate,
  releaseDatePrecision,
}: Pick<Episode, "releaseDate" | "releaseDatePrecision">) =>
  formatsByPrecision[releaseDatePrecision].format(new Date(releaseDate))
