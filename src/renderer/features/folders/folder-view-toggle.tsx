import { LayoutGrid, List, type LucideIcon } from "lucide-react"
import type { FolderView } from "../../../shared/folder-view"

interface ViewButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly pressed: boolean
  readonly onClick: () => void
}

function ViewButton({ label, icon: Icon, pressed, onClick }: ViewButtonProps) {
  const stateStyle = pressed
    ? "bg-accent text-on-accent"
    : "text-muted hover:bg-surface-raised hover:text-foreground"
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-full transition-colors duration-120 ease-out ${stateStyle}`}
    >
      <Icon aria-hidden size={20} />
    </button>
  )
}

interface FolderViewToggleProps {
  readonly view: FolderView
  readonly onChange: (view: FolderView) => void
}

export function FolderViewToggle({ view, onChange }: FolderViewToggleProps) {
  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">View</legend>
      <ViewButton
        label="Grid"
        icon={LayoutGrid}
        pressed={view === "grid"}
        onClick={() => onChange("grid")}
      />
      <ViewButton
        label="List"
        icon={List}
        pressed={view === "list"}
        onClick={() => onChange("list")}
      />
    </fieldset>
  )
}
