import type { FolderView } from "../../../shared/folder-view"
import { FilterChip } from "../../ui/filter-chip"

interface FolderViewToggleProps {
  readonly view: FolderView
  readonly onChange: (view: FolderView) => void
}

export function FolderViewToggle({ view, onChange }: FolderViewToggleProps) {
  return (
    <fieldset className="flex gap-2">
      <legend className="sr-only">View</legend>
      <FilterChip label="Grid" pressed={view === "grid"} onClick={() => onChange("grid")} />
      <FilterChip label="List" pressed={view === "list"} onClick={() => onChange("list")} />
    </fieldset>
  )
}
