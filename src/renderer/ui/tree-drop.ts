import type { TreeNode } from "./visible-tree-rows"

// Where a dragged item lands next to the item under the pointer: on the line
// above it, inside it, or on the line below it.
export type TreeDropPosition = "before" | "inside" | "after"

export interface TreeDrop<Value> {
  readonly dragged: Value
  readonly target: Value
  readonly position: TreeDropPosition
}

interface PointerOverRow {
  readonly pointerY: number
  readonly rowTop: number
  readonly rowHeight: number
}

// A branch takes its middle half as a drop inside it and leaves a quarter at
// each edge for the lines around it. A leaf has no inside, so its halves pick
// the line above or below.
const positionInRow = (
  { pointerY, rowTop, rowHeight }: PointerOverRow,
  isBranch: boolean,
): TreeDropPosition => {
  const fraction = (pointerY - rowTop) / rowHeight
  if (!isBranch) {
    return fraction < 0.5 ? "before" : "after"
  }
  if (fraction < 0.25) return "before"
  if (fraction > 0.75) return "after"
  return "inside"
}

// The children of an expanded branch sit right below it, so the line below it
// is the line above its first child, and a drop there lands first inside it.
export const dropPlaceAt = <Value>(
  overNode: TreeNode<Value>,
  expandedKeys: ReadonlySet<string>,
  pointer: PointerOverRow,
): { readonly target: TreeNode<Value>; readonly position: TreeDropPosition } => {
  const position = positionInRow(pointer, overNode.children !== null)
  const firstChild = expandedKeys.has(overNode.key) ? overNode.children?.[0] : undefined
  if (position === "after" && firstChild !== undefined) {
    return { target: firstChild, position: "before" }
  }
  return { target: overNode, position }
}
