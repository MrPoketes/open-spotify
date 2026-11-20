import { use, useId } from "react"
import { FilterChip } from "../../ui/filter-chip"
import { TrackListDensityContext } from "./track-list-density-context"

export function TrackListDensitySetting() {
  const { density, chooseDensity } = use(TrackListDensityContext)
  const descriptionId = useId()

  return (
    <fieldset aria-describedby={descriptionId} className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">Track list rows</legend>
      <p id={descriptionId} className="text-xs text-muted">
        Dense rows leave out artwork, so twice as many tracks fit on screen.
      </p>
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="Comfortable"
          pressed={density === "comfortable"}
          onClick={() => chooseDensity("comfortable")}
        />
        <FilterChip
          label="Dense"
          pressed={density === "dense"}
          onClick={() => chooseDensity("dense")}
        />
      </div>
    </fieldset>
  )
}
