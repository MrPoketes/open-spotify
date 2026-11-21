import { type ReactNode, type Ref, useImperativeHandle } from "react"
import { type RovingRowProps, type RowFocusHandle, useRovingFocus } from "./use-roving-focus"

interface RovingListProps<Row> {
  readonly rows: ReadonlyArray<Row>
  readonly rowKey: (row: Row) => string
  // Renders the row's focusable element, spreading rovingProps onto it.
  readonly renderRow: (row: Row, rovingProps: RovingRowProps) => ReactNode
  readonly className: string
  readonly id?: string | undefined
  readonly label?: string
  readonly ref?: Ref<HTMLUListElement> | undefined
  readonly rowFocusRef?: Ref<RowFocusHandle> | undefined
}

export function RovingList<Row>({
  rows,
  rowKey,
  renderRow,
  className,
  id,
  label,
  ref,
  rowFocusRef,
}: RovingListProps<Row>) {
  const { onKeyDown, rowProps, focusRow } = useRovingFocus(rows.length)
  useImperativeHandle(rowFocusRef, () => ({ focusRow }), [focusRow])
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused row, and the list moves focus between its rows: the roving focus docs/design.md requires for lists
    <ul id={id} ref={ref} onKeyDown={onKeyDown} aria-label={label} className={className}>
      {rows.map((row, index) => (
        <li key={rowKey(row)}>{renderRow(row, rowProps(index))}</li>
      ))}
    </ul>
  )
}
