import { type DragMoveEvent, useDndMonitor } from "@dnd-kit/core"
import { useEffect, useEffectEvent, useState } from "react"
import { pointerYOf } from "./row-under-pointer"
import { type TreeDrop, type TreeDropPosition, dropPlaceAt } from "./tree-drop"
import type { VisibleTreeRow } from "./visible-tree-rows"

export interface TreeDropRules<Value> {
  // A drop the owner refuses shows no indicator and does nothing.
  readonly canDrop: (drop: TreeDrop<Value>) => boolean
  readonly onDrop: (drop: TreeDrop<Value>) => void
  // A row dragged in from elsewhere in the drag area brings the data its
  // source gave dnd-kit, which carries no type, so the owner decodes it. One
  // of the tree's own rows that is gone mid-drag comes here too, with no
  // data, so the owner must refuse data it cannot decode.
  readonly canDropFromOutside: (drop: TreeDrop<Value, unknown>) => boolean
  readonly onDropFromOutside: (drop: TreeDrop<Value, unknown>) => void
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

// Long enough that dragging past a collapsed branch leaves it closed.
const expandDelayMilliseconds = 600

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

// Shows where a row dragged in the enclosing RowDragArea would land in the
// tree, and hands the drop to the owner.
export function useTreeDragAndDrop<Value>(options: TreeDragAndDropOptions<Value>) {
  const { rows, expandedKeys } = options
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const findRow = (key: unknown) => rows.find((row) => row.node.key === key)
  useExpandWhileDropInside(dropIndicator, expandedKeys, options.onToggleExpanded)

  // The rows can change under a drag, for example when the tree is read
  // again, so the row under the pointer may be gone.
  const dropPlace = (event: DragMoveEvent) => {
    const { over } = event
    const pointerY = pointerYOf(event)
    if (over === null || pointerY === undefined) return undefined
    const overRow = findRow(over.id)
    if (overRow === undefined) return undefined
    return dropPlaceAt(overRow.node, expandedKeys, {
      pointerY,
      rowTop: over.rect.top,
      rowHeight: over.rect.height,
    })
  }

  const allowedDropAt = (event: DragMoveEvent) => {
    const place = dropPlace(event)
    if (place === undefined) return undefined
    const indicator = { targetKey: place.target.key, position: place.position }
    const placed = { target: place.target.value, position: place.position }
    const draggedRow = findRow(event.active.id)
    if (draggedRow !== undefined) {
      const drop = { ...placed, dragged: draggedRow.node.value }
      return options.canDrop(drop) ? { indicator, carryOut: () => options.onDrop(drop) } : undefined
    }
    const drop = { ...placed, dragged: event.active.data.current }
    return options.canDropFromOutside(drop)
      ? { indicator, carryOut: () => options.onDropFromOutside(drop) }
      : undefined
  }

  // dnd-kit reports a move before it finds the row under the pointer, and
  // reports that row in a later drag over event.
  const showDropAt = (event: DragMoveEvent) => {
    const indicator = allowedDropAt(event)?.indicator ?? null
    setDropIndicator((current) => (isSameIndicator(current, indicator) ? current : indicator))
  }

  const endDrag = () => {
    setDraggedKey(null)
    setDropIndicator(null)
  }

  useDndMonitor({
    onDragStart: ({ active }) => setDraggedKey(String(active.id)),
    onDragMove: showDropAt,
    onDragOver: showDropAt,
    onDragEnd: (event) => {
      endDrag()
      allowedDropAt(event)?.carryOut()
    },
    onDragCancel: endDrag,
  })

  return { draggedKey, dropIndicator }
}
