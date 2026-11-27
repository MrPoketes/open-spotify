import { use, useId } from "react"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { SegmentedControl, type SegmentedControlOption } from "../../ui/segmented-control"
import { TrackListDensityContext } from "./track-list-density-context"

const densityOptions: ReadonlyArray<SegmentedControlOption<TrackListDensity>> = [
  { value: "comfortable", label: "Comfortable" },
  { value: "dense", label: "Dense" },
]

export function TrackListDensitySetting() {
  const { density, chooseDensity } = use(TrackListDensityContext)
  const descriptionId = useId()

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">Track list rows</p>
      <p id={descriptionId} className="text-xs text-muted">
        Dense rows leave out artwork, so twice as many tracks fit on screen.
      </p>
      <SegmentedControl
        label="Track list rows"
        aria-describedby={descriptionId}
        options={densityOptions}
        value={density}
        onChange={chooseDensity}
      />
    </div>
  )
}
