import { createContext } from "react"
import { defaultTrackListDensity, type TrackListDensity } from "../../../shared/track-list-density"

interface TrackListDensityChoice {
  readonly density: TrackListDensity
  readonly chooseDensity: (density: TrackListDensity) => void
}

// The app shell provides the saved density. A list rendered without it, as in
// a test of a single page, keeps the default and offers no way to change it.
export const TrackListDensityContext = createContext<TrackListDensityChoice>({
  density: defaultTrackListDensity,
  chooseDensity: () => undefined,
})
