import type { KeyboardEvent, PointerEvent } from "react"
import { clamp } from "../lib/clamp"
import { hasShortcutModifier } from "./has-shortcut-modifier"

const keyboardStep = 16

// A pane that can collapse to a narrow strip, as the sidebar collapses to its
// icon rail.
interface PaneCollapse {
  readonly isCollapsed: boolean
  readonly collapsedWidth: number
  readonly onCollapsedChange: (isCollapsed: boolean) => void
}

interface PaneDividerProps {
  readonly label: string
  readonly paneSide: "left" | "right"
  readonly paneWidth: number
  readonly minimumWidth: number
  readonly maximumWidth: number
  readonly defaultWidth: number
  readonly onResize: (width: number) => void
  readonly onResizeEnd: (width: number) => void
  readonly collapse?: PaneCollapse
}

// A drag that ends nearer the collapsed width than the minimum width
// collapses the pane; dragging back past that point opens it again.
const collapsesAt = (collapse: PaneCollapse, minimumWidth: number) =>
  (collapse.collapsedWidth + minimumWidth) / 2

// Resizes the pane on its `paneSide`. `onResize` fires on every change so the
// layout follows the pointer; `onResizeEnd` fires once the user lets go, so
// callers can save the width without writing on every pointer move.
export function PaneDivider({
  label,
  paneSide,
  paneWidth,
  minimumWidth,
  maximumWidth,
  defaultWidth,
  onResize,
  onResizeEnd,
  collapse,
}: PaneDividerProps) {
  const growDirection = paneSide === "left" ? 1 : -1
  const isCollapsed = collapse?.isCollapsed === true
  const shownWidth = isCollapsed ? collapse.collapsedWidth : paneWidth

  // Whole pixels, because high-DPI screens report fractional pointer positions.
  const clampWidth = (width: number) => Math.round(clamp(width, minimumWidth, maximumWidth))

  // Only a resize that widens the pane (see widthForKey) reaches a collapsed
  // one, and opens it.
  const resizeTo = (width: number) => {
    if (isCollapsed) collapse.onCollapsedChange(false)
    const clampedWidth = clampWidth(width)
    if (clampedWidth === paneWidth) {
      return
    }
    onResize(clampedWidth)
    onResizeEnd(clampedWidth)
  }

  // Collapsing is decided on the width the pointer asks for, before it is
  // held to the minimum. Collapsing puts back the width the drag started
  // from, so the pane opens to it again rather than to the minimum.
  const followPointer = (requestedWidth: number, previous: DragState): DragState => {
    const shouldCollapse =
      collapse !== undefined && requestedWidth < collapsesAt(collapse, minimumWidth)
    if (shouldCollapse !== previous.isCollapsed) collapse?.onCollapsedChange(shouldCollapse)
    if (shouldCollapse) {
      onResize(paneWidth)
      return { width: paneWidth, isCollapsed: true }
    }
    const width = clampWidth(requestedWidth)
    onResize(width)
    return { width, isCollapsed: false }
  }

  const startDrag = dividerDrag({
    start: { width: paneWidth, isCollapsed },
    shownWidth,
    growDirection,
    followPointer,
    onResizeEnd,
  })

  // A collapsed pane ignores the keys that would narrow it, and the key that
  // widens it by a step opens it at the width it had.
  const growKey = growDirection === 1 ? "ArrowRight" : "ArrowLeft"
  const widthForKey: Partial<Record<string, number>> = isCollapsed
    ? { [growKey]: paneWidth, End: maximumWidth }
    : {
        ArrowLeft: paneWidth - keyboardStep * growDirection,
        ArrowRight: paneWidth + keyboardStep * growDirection,
        Home: minimumWidth,
        End: maximumWidth,
      }

  const resizeWithKeyboard = (event: KeyboardEvent) => {
    const width = widthForKey[event.key]
    if (width === undefined || hasShortcutModifier(event)) {
      return
    }
    event.preventDefault()
    resizeTo(width)
  }

  return (
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a focusable separator is the ARIA window splitter widget; lint treats `hr` as static and rejects focus and input on it
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={shownWidth}
      aria-valuetext={isCollapsed ? "Collapsed" : `${paneWidth} pixels`}
      aria-valuemin={collapse === undefined ? minimumWidth : collapse.collapsedWidth}
      aria-valuemax={maximumWidth}
      tabIndex={0}
      onPointerDown={startDrag}
      onKeyDown={resizeWithKeyboard}
      onDoubleClick={() => resizeTo(defaultWidth)}
      className="w-2 shrink-0 cursor-col-resize touch-none rounded-full transition-colors duration-120 ease-out hover:bg-border"
    />
  )
}

interface DragState {
  readonly width: number
  readonly isCollapsed: boolean
}

interface DividerDrag {
  readonly start: DragState
  readonly shownWidth: number
  readonly growDirection: 1 | -1
  readonly followPointer: (requestedWidth: number, previous: DragState) => DragState
  readonly onResizeEnd: (width: number) => void
}

// Listening on the window keeps the drag going when the pointer moves faster
// than the 8 px handle and leaves it.
const dividerDrag =
  ({ start, shownWidth, growDirection, followPointer, onResizeEnd }: DividerDrag) =>
  (pointerDown: PointerEvent) => {
    if (pointerDown.button !== 0) {
      return
    }
    pointerDown.preventDefault()
    const startX = pointerDown.clientX
    let dragged = start
    const followMove = (pointerMove: globalThis.PointerEvent) => {
      dragged = followPointer(shownWidth + (pointerMove.clientX - startX) * growDirection, dragged)
    }
    const stopDrag = () => {
      window.removeEventListener("pointermove", followMove)
      window.removeEventListener("pointerup", stopDrag)
      window.removeEventListener("pointercancel", stopDrag)
      if (dragged.width !== start.width) {
        onResizeEnd(dragged.width)
      }
    }
    window.addEventListener("pointermove", followMove)
    window.addEventListener("pointerup", stopDrag)
    window.addEventListener("pointercancel", stopDrag)
  }
