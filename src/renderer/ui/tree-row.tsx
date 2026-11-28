import { useDraggable, useDroppable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { buttonVariants } from "./button-variants"
import { cn } from "./class-names"
import { sidebarRowClassNames } from "./sidebar-row-class-names"
import type { TreeDropPosition } from "./tree-drop"

// Spacing steps each level indents by, so a theme's spacing scales the tree.
const levelIndentSteps = 4

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
// role and keyboard handling alone, since only the mouse drags. The expander
// ends the row, so every item's artwork starts on the same edge as the rows
// outside the tree, indented only by its level.
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
  const indent = `calc(var(--theme-spacing) * ${(level - 1) * levelIndentSteps})`
  return (
    <div
      ref={(row) => {
        draggable.setNodeRef(row)
        droppable.setNodeRef(row)
      }}
      {...draggable.listeners}
      role="none"
      style={{ paddingLeft: indent }}
      className={`relative flex items-center ${sidebarRowClassNames.surface} ${highlightWhenDroppedInside} ${isDragged ? "opacity-50" : ""}`}
    >
      {children}
      {expander}
      {dropPosition === "before" || dropPosition === "after" ? (
        <DropLine position={dropPosition} indent={indent} />
      ) : null}
    </div>
  )
}

interface DropLineProps {
  readonly position: "before" | "after"
  readonly indent: string
}

// The ring at the start of the line marks the level the entry lands at.
function DropLine({ position, indent }: DropLineProps) {
  return (
    <span
      aria-hidden
      style={{ left: indent }}
      className={`pointer-events-none absolute right-0 h-0.5 bg-accent ${position === "before" ? "top-0" : "bottom-0"}`}
    >
      <span className="absolute -top-0.75 -left-1 size-2 rounded-full border-2 border-accent bg-canvas" />
    </span>
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
    return null
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
      // The row under it already takes surface-raised on hover.
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "mr-2 not-disabled:not-aria-disabled:hover:bg-surface-overlay",
      )}
    >
      <ChevronIcon size={16} />
    </button>
  )
}
