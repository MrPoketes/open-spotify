import { use } from "react"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { SegmentedControl, type SegmentedControlOption } from "../../ui/segmented-control"
import { SettingRow } from "../../ui/setting-row"
import { TrackListDensityContext } from "./track-list-density-context"

const densityOptions: ReadonlyArray<SegmentedControlOption<TrackListDensity>> = [
  { value: "comfortable", label: "Comfortable" },
  { value: "dense", label: "Dense" },
]

export function TrackListDensitySetting() {
  const { density, chooseDensity } = use(TrackListDensityContext)

  return (
    <SettingRow
      label="Track list rows"
      description="Dense rows leave out artwork, so twice as many tracks fit on screen."
    >
      {({ descriptionId }) => (
        <SegmentedControl
          label="Track list rows"
          aria-describedby={descriptionId}
          options={densityOptions}
          value={density}
          onChange={chooseDensity}
        />
      )}
    </SettingRow>
  )
}
