export interface TreeNode<Value> {
  readonly key: string
  readonly value: Value
  // null for a leaf. A branch with nothing in it, such as an empty folder,
  // has an empty array and can still be expanded.
  readonly children: ReadonlyArray<TreeNode<Value>> | null
}

export interface VisibleTreeRow<Value> {
  readonly node: TreeNode<Value>
  readonly level: number
  readonly setSize: number
  readonly positionInSet: number
  readonly parentIndex: number | undefined
}

// The nodes on screen, top to bottom: every top-level node, and the children
// of each expanded node right after it.
export const visibleTreeRows = <Value>(
  nodes: ReadonlyArray<TreeNode<Value>>,
  expandedKeys: ReadonlySet<string>,
): ReadonlyArray<VisibleTreeRow<Value>> => {
  const rows: Array<VisibleTreeRow<Value>> = []
  const addSiblings = (
    siblings: ReadonlyArray<TreeNode<Value>>,
    level: number,
    parentIndex: number | undefined,
  ) =>
    siblings.forEach((node, index) => {
      const rowIndex = rows.length
      rows.push({ node, level, setSize: siblings.length, positionInSet: index + 1, parentIndex })
      if (node.children !== null && expandedKeys.has(node.key)) {
        addSiblings(node.children, level + 1, rowIndex)
      }
    })
  addSiblings(nodes, 1, undefined)
  return rows
}
