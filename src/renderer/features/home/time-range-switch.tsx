import { SegmentedControl, type SegmentedControlOption } from "../../ui/segmented-control"
import type { TimeRange } from "../spotify/spotify-listening-history"

// Spotify computes long_term from about a year of listening, so it is not
// labelled "All time".
const timeRangeOptions: ReadonlyArray<SegmentedControlOption<TimeRange>> = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "Last year" },
]

interface TimeRangeSwitchProps {
  readonly label: string
  readonly timeRange: TimeRange
  readonly onChange: (timeRange: TimeRange) => void
}

export function TimeRangeSwitch({ label, timeRange, onChange }: TimeRangeSwitchProps) {
  return (
    <SegmentedControl
      label={label}
      options={timeRangeOptions}
      value={timeRange}
      onChange={onChange}
    />
  )
}
