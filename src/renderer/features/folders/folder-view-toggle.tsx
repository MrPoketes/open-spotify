import type { FolderView } from "../../../shared/folder-view"
import { SegmentedControl, type SegmentedControlOption } from "../../ui/segmented-control"

const viewOptions: ReadonlyArray<SegmentedControlOption<FolderView>> = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
]

interface FolderViewToggleProps {
  readonly view: FolderView
  readonly onChange: (view: FolderView) => void
}

export function FolderViewToggle({ view, onChange }: FolderViewToggleProps) {
  return <SegmentedControl label="View" options={viewOptions} value={view} onChange={onChange} />
}
