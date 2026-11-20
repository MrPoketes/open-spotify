import { FilterChip } from "../../ui/filter-chip"
import type { TimeRange } from "../spotify/spotify-listening-history"

// Spotify computes long_term from about a year of listening, so it is not
// labelled "All time".
const timeRangeChips: ReadonlyArray<{ readonly timeRange: TimeRange; readonly label: string }> = [
  { timeRange: "short_term", label: "Last 4 weeks" },
  { timeRange: "medium_term", label: "Last 6 months" },
  { timeRange: "long_term", label: "Last year" },
]

interface TimeRangeSwitchProps {
  readonly legend: string
  readonly timeRange: TimeRange
  readonly onChange: (timeRange: TimeRange) => void
}

export function TimeRangeSwitch({ legend, timeRange, onChange }: TimeRangeSwitchProps) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{legend}</legend>
      {timeRangeChips.map((chip) => (
        <FilterChip
          key={chip.timeRange}
          label={chip.label}
          pressed={chip.timeRange === timeRange}
          onClick={() => onChange(chip.timeRange)}
        />
      ))}
    </fieldset>
  )
}
