import { useDraggable, useDroppable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import type { TreeDropPosition } from "./tree-drop"

const levelIndent = 16

const highlightWhenDroppedInside =
  "has-data-[drop-position=inside]:bg-surface-raised has-data-[drop-position=inside]:outline-2 has-data-[drop-position=inside]:-outline-offset-2 has-data-[drop-position=inside]:outline-accent"

interface TreeRowProps {
  readonly rowKey: string
  readonly level: number
  readonly isDragged: boolean
  // Where a drop would land relative to this row, if it is the drop target.
  readonly dropPosition: TreeDropPosition | undefined
  readonly expander: ReactNode
  readonly children: ReactNode
}

// The whole row can be dragged and dropped on. Dragging leaves the tree item's
// role and keyboard handling alone, since only the mouse drags.
export function TreeRow({
  rowKey,
  level,
  isDragged,
  dropPosition,
  expander,
  children,
}: TreeRowProps) {
  const draggable = useDraggable({ id: rowKey })
  const droppable = useDroppable({ id: rowKey })
  const indent = (level - 1) * levelIndent
  return (
    <div
      ref={(row) => {
        draggable.setNodeRef(row)
        droppable.setNodeRef(row)
      }}
      {...draggable.listeners}
      role="none"
      style={{ paddingLeft: indent }}
      className={`relative flex items-center rounded-small transition-colors duration-120 ease-out hover:bg-surface-raised ${highlightWhenDroppedInside} ${isDragged ? "opacity-50" : ""}`}
    >
      {expander}
      {children}
      {dropPosition === "before" || dropPosition === "after" ? (
        <DropLine position={dropPosition} indent={indent} />
      ) : null}
    </div>
  )
}

interface DropLineProps {
  readonly position: "before" | "after"
  readonly indent: number
}

function DropLine({ position, indent }: DropLineProps) {
  return (
    <span
      aria-hidden
      style={{ left: indent }}
      className={`pointer-events-none absolute right-0 h-0.5 rounded-full bg-accent ${position === "before" ? "top-0" : "bottom-0"}`}
    />
  )
}

interface ExpanderProps {
  readonly isBranch: boolean
  readonly isExpanded: boolean
  readonly onToggle: () => void
}

// A shortcut for the mouse. Keyboard and screen reader users expand and
// collapse the tree item itself with the arrow keys, and the item announces
// its state, so the button stays out of the tab order and the accessibility
// tree.
export function Expander({ isBranch, isExpanded, onToggle }: ExpanderProps) {
  if (!isBranch) {
    return <span aria-hidden className="w-6 shrink-0" />
  }
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      // Focus goes to the tree item instead, since the button is hidden from
      // assistive technology.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
      className="flex h-8 w-6 shrink-0 items-center justify-center rounded-small text-muted transition-colors duration-120 ease-out hover:text-foreground"
    >
      <ChevronIcon size={16} />
    </button>
  )
}
