import {
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  type PointerSensorOptions,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { type PointerEvent, useEffect, useEffectEvent, useState } from "react"
import { type TreeDrop, type TreeDropPosition, dropPlaceAt } from "./tree-drop"
import type { VisibleTreeRow } from "./visible-tree-rows"

export interface TreeDropRules<Value> {
  // A drop the owner refuses shows no indicator and does nothing.
  readonly canDrop: (drop: TreeDrop<Value>) => boolean
  readonly onDrop: (drop: TreeDrop<Value>) => void
}

interface TreeDragAndDropOptions<Value> extends TreeDropRules<Value> {
  readonly rows: ReadonlyArray<VisibleTreeRow<Value>>
  readonly expandedKeys: ReadonlySet<string>
  readonly onToggleExpanded: (key: string) => void
}

interface DropIndicator {
  readonly targetKey: string
  readonly position: TreeDropPosition
}

// A press that moves less than this is a click on the row.
const dragStartDistance = 4

// Long enough that dragging past a collapsed branch leaves it closed.
const expandDelayMilliseconds = 600

// A press in a text field, such as a rename field, selects text. A press in a
// menu that a row opened reaches the row through React even though the menu
// is drawn elsewhere on the page. Neither starts a drag.
const pressStartsDrag = ({ target, currentTarget }: PointerEvent) =>
  target instanceof Element &&
  currentTarget.contains(target) &&
  target.closest("input, textarea, [contenteditable]") === null

class RowPointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (event: PointerEvent, options: PointerSensorOptions) =>
        pressStartsDrag(event) &&
        PointerSensor.activators.every(({ handler }) => handler(event, options)),
    },
  ]
}

// Letting go over the row the drag started on clicks that row, such as its
// link. dnd-kit stops that click before React sees it but leaves the browser's
// default, which would load the link's page in full, so the click is cancelled
// too. Like dnd-kit, this stops listening for the click after 50 ms.
const cancelClick = (event: MouseEvent) => event.preventDefault()

const cancelClickAfterDrag = () => {
  window.addEventListener("click", cancelClick, { capture: true })
  setTimeout(() => window.removeEventListener("click", cancelClick, { capture: true }), 50)
}

const isSameIndicator = (first: DropIndicator | null, second: DropIndicator | null) =>
  first?.targetKey === second?.targetKey && first?.position === second?.position

// Opens a collapsed branch once a drop inside it has been on offer for a
// moment, so the item can be dropped among its children instead. The branch
// row stays where it is as it opens, so the drop it offers stays the same.
function useExpandWhileDropInside(
  dropIndicator: DropIndicator | null,
  expandedKeys: ReadonlySet<string>,
  onToggleExpanded: (key: string) => void,
) {
  const keyToExpand =
    dropIndicator?.position === "inside" && !expandedKeys.has(dropIndicator.targetKey)
      ? dropIndicator.targetKey
      : null
  const expand = useEffectEvent(onToggleExpanded)
  useEffect(() => {
    if (keyToExpand === null) return undefined
    const timer = setTimeout(() => expand(keyToExpand), expandDelayMilliseconds)
    return () => clearTimeout(timer)
  }, [keyToExpand])
}

// dnd-kit's drag events say how far the dragged row has moved, which also
// counts scrolling and shifts of the row itself, such as when a branch above
// it opens. Only collision detection sees where the pointer is, so it passes
// that on with the row under the pointer.
const rowUnderPointer: CollisionDetection = (args) =>
  pointerWithin(args).map((collision) => ({
    ...collision,
    data: { ...collision.data, pointerY: args.pointerCoordinates?.y },
  }))

const pointerYOf = ({ collisions }: DragMoveEvent) => {
  const collisionData: Record<string, unknown> | undefined = collisions?.[0]?.data
  const pointerY = collisionData?.["pointerY"]
  return typeof pointerY === "number" ? pointerY : undefined
}

// Rearranges a tree with the mouse. Keyboard users have the owner's own
// commands for the same moves, so the tree adds no keyboard sensor, whose
// Space and Enter would clash with the row's.
export function useTreeDragAndDrop<Value>(options: TreeDragAndDropOptions<Value>) {
  const { rows, expandedKeys, canDrop, onDrop } = options
  const sensors = useSensors(
    useSensor(RowPointerSensor, { activationConstraint: { distance: dragStartDistance } }),
  )
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  // dnd-kit's live region and its instructions for picking items up with the
  // keyboard would tell screen reader users about drags they cannot make, so
  // they go into an element that is never on the page. The owner reports
  // each drop in its own words.
  const [offPageContainer] = useState(() => document.createElement("div"))
  const findRow = (key: unknown) => rows.find((row) => row.node.key === key)
  useExpandWhileDropInside(dropIndicator, expandedKeys, options.onToggleExpanded)

  // The rows can change under a drag, for example when the tree is read
  // again, so the dragged row or the one under the pointer may be gone.
  const dropAt = (event: DragMoveEvent) => {
    const { active, over } = event
    const pointerY = pointerYOf(event)
    if (over === null || pointerY === undefined) return undefined
    const draggedRow = findRow(active.id)
    const overRow = findRow(over.id)
    if (draggedRow === undefined || overRow === undefined) return undefined
    const { target, position } = dropPlaceAt(overRow.node, expandedKeys, {
      pointerY,
      rowTop: over.rect.top,
      rowHeight: over.rect.height,
    })
    const drop = { dragged: draggedRow.node.value, target: target.value, position }
    if (!canDrop(drop)) return undefined
    return { drop, indicator: { targetKey: target.key, position } }
  }

  // dnd-kit reports a move before it finds the row under the pointer, and
  // reports that row in a later drag over event.
  const showDropAt = (event: DragMoveEvent) => {
    const indicator = dropAt(event)?.indicator ?? null
    setDropIndicator((current) => (isSameIndicator(current, indicator) ? current : indicator))
  }

  const endDrag = () => {
    cancelClickAfterDrag()
    setDraggedKey(null)
    setDropIndicator(null)
  }

  return {
    draggedKey,
    dropIndicator,
    contextProps: {
      sensors,
      collisionDetection: rowUnderPointer,
      // An expanding branch puts new rows under the pointer mid-drag.
      measuring: { droppable: { strategy: MeasuringStrategy.Always } },
      accessibility: { container: offPageContainer },
      onDragStart: ({ active }: DragStartEvent) => setDraggedKey(String(active.id)),
      onDragMove: showDropAt,
      onDragOver: showDropAt,
      onDragEnd: (event: DragEndEvent) => {
        endDrag()
        const placed = dropAt(event)
        if (placed !== undefined) onDrop(placed.drop)
      },
      onDragCancel: endDrag,
    },
  }
}
