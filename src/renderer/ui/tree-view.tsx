import { ChevronDown, ChevronRight } from "lucide-react"
import {
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react"
import { hasShortcutModifier } from "./has-shortcut-modifier"
import { type RovingRowProps, type RowFocusHandle, useRovingFocus } from "./use-roving-focus"
import { type TreeNode, type VisibleTreeRow, visibleTreeRows } from "./visible-tree-rows"

export interface TreeItemProps extends RovingRowProps {
  readonly role: "treeitem"
  readonly "aria-level": number
  readonly "aria-setsize": number
  readonly "aria-posinset": number
  readonly "aria-expanded": boolean | undefined
  readonly onKeyDown: (event: KeyboardEvent) => void
}

interface TreeViewProps<Value> {
  readonly labelledBy: string
  readonly nodes: ReadonlyArray<TreeNode<Value>>
  readonly expandedKeys: ReadonlySet<string>
  readonly onToggleExpanded: (key: string) => void
  // Renders the focusable tree item, spreading itemProps onto it.
  readonly renderItem: (value: Value, itemProps: TreeItemProps) => ReactNode
  // Lets the owner move focus to a row, such as after a change removed the
  // focused one.
  readonly rowFocusRef?: Ref<RowFocusHandle>
}

const levelIndent = 16

interface FocusedRow {
  readonly key: string
  readonly index: number
  readonly element: Element | null
}

// When the rows change under the focused item, such as when it moves, focus
// follows it to its new place, or goes to the row that takes its place when it
// is gone. A moved or removed element can lose focus to the body, so focus
// follows from there too. Focus that went anywhere else, such as into a
// rename field, went there on purpose and stays.
function useFocusFollowsRow<Value>(
  rows: ReadonlyArray<VisibleTreeRow<Value>>,
  focusRow: (index: number) => void,
) {
  const focusedRow = useRef<FocusedRow | null>(null)
  const rowKeys = JSON.stringify(rows.map((row) => row.node.key))
  const renderedRowKeys = useRef(rowKeys)

  // Runs after every render, but acts only when the rows changed, so a render
  // for any other reason never pulls focus back into the tree.
  useLayoutEffect(() => {
    if (renderedRowKeys.current === rowKeys) return
    renderedRowKeys.current = rowKeys
    if (focusedRow.current === null) return
    const { key, index, element } = focusedRow.current
    const { activeElement } = document
    if (activeElement !== element && activeElement !== document.body) return
    const newIndex = rows.findIndex((row) => row.node.key === key)
    if (newIndex === -1) {
      focusRow(index)
      return
    }
    // The row may have kept focus, so it gets no focus event to remember its
    // new index by.
    focusRow(newIndex)
    focusedRow.current = { ...focusedRow.current, index: newIndex }
  })

  return (row: FocusedRow) => {
    focusedRow.current = row
  }
}

// The WAI-ARIA tree view pattern, rendered flat: every visible item is a
// sibling that carries its level and position, so no group element has to wrap
// an expanded item's children. The tree is one tab stop, and the arrow keys
// move between items and expand or collapse them.
export function TreeView<Value>({
  labelledBy,
  nodes,
  expandedKeys,
  onToggleExpanded,
  renderItem,
  rowFocusRef,
}: TreeViewProps<Value>) {
  const rows = visibleTreeRows(nodes, expandedKeys)
  const { onKeyDown, rowProps, focusRow } = useRovingFocus(rows.length)
  useImperativeHandle(rowFocusRef, () => ({ focusRow }), [focusRow])
  const rememberFocusedRow = useFocusFollowsRow(rows, focusRow)

  // An expanded item has its first child right below it.
  const expandOrEnter = ({ node }: VisibleTreeRow<Value>, index: number) => {
    if (!expandedKeys.has(node.key)) onToggleExpanded(node.key)
    else if (node.children !== null && node.children.length > 0) focusRow(index + 1)
  }

  const collapseOrLeave = ({ node, parentIndex }: VisibleTreeRow<Value>) => {
    if (expandedKeys.has(node.key)) onToggleExpanded(node.key)
    else if (parentIndex !== undefined) focusRow(parentIndex)
  }

  const expandOrCollapseWithKey = (
    event: KeyboardEvent,
    row: VisibleTreeRow<Value>,
    index: number,
  ) => {
    if (hasShortcutModifier(event)) return
    if (event.key === "ArrowRight" && row.node.children !== null) {
      event.preventDefault()
      expandOrEnter(row, index)
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      collapseOrLeave(row)
    }
  }

  const itemProps = (row: VisibleTreeRow<Value>, index: number): TreeItemProps => {
    const rovingProps = rowProps(index)
    return {
      ...rovingProps,
      onFocus: () => {
        rovingProps.onFocus()
        rememberFocusedRow({ key: row.node.key, index, element: document.activeElement })
      },
      role: "treeitem",
      "aria-level": row.level,
      "aria-setsize": row.setSize,
      "aria-posinset": row.positionInSet,
      "aria-expanded": row.node.children === null ? undefined : expandedKeys.has(row.node.key),
      onKeyDown: (event) => expandOrCollapseWithKey(event, row, index),
    }
  }

  return (
    <div
      role="tree"
      tabIndex={-1}
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className="flex flex-col"
    >
      {rows.map((row, index) => (
        <div
          key={row.node.key}
          role="none"
          style={{ paddingLeft: (row.level - 1) * levelIndent }}
          className="flex items-center rounded-small transition-colors duration-120 ease-out hover:bg-surface-raised"
        >
          <Expander
            isBranch={row.node.children !== null}
            isExpanded={expandedKeys.has(row.node.key)}
            onToggle={() => {
              focusRow(index)
              onToggleExpanded(row.node.key)
            }}
          />
          {renderItem(row.node.value, itemProps(row, index))}
        </div>
      ))}
    </div>
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
function Expander({ isBranch, isExpanded, onToggle }: ExpanderProps) {
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
