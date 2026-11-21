import type { KeyboardEvent, PointerEvent } from "react"
import { clamp } from "../lib/clamp"
import { hasShortcutModifier } from "./has-shortcut-modifier"

const keyboardStep = 16

interface PaneDividerProps {
  readonly label: string
  readonly paneSide: "left" | "right"
  readonly paneWidth: number
  readonly minimumWidth: number
  readonly maximumWidth: number
  readonly defaultWidth: number
  readonly onResize: (width: number) => void
  readonly onResizeEnd: (width: number) => void
}

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
}: PaneDividerProps) {
  const growDirection = paneSide === "left" ? 1 : -1

  // Whole pixels, because high-DPI screens report fractional pointer positions.
  const clampWidth = (width: number) => Math.round(clamp(width, minimumWidth, maximumWidth))

  const resizeTo = (width: number) => {
    const clampedWidth = clampWidth(width)
    if (clampedWidth === paneWidth) {
      return
    }
    onResize(clampedWidth)
    onResizeEnd(clampedWidth)
  }

  // Listening on the window keeps the drag going when the pointer moves
  // faster than the 8 px handle and leaves it.
  const startDrag = (pointerDown: PointerEvent) => {
    if (pointerDown.button !== 0) {
      return
    }
    pointerDown.preventDefault()
    const startX = pointerDown.clientX
    let draggedWidth = paneWidth
    const followPointer = (pointerMove: globalThis.PointerEvent) => {
      draggedWidth = clampWidth(paneWidth + (pointerMove.clientX - startX) * growDirection)
      onResize(draggedWidth)
    }
    const stopDrag = () => {
      window.removeEventListener("pointermove", followPointer)
      window.removeEventListener("pointerup", stopDrag)
      window.removeEventListener("pointercancel", stopDrag)
      if (draggedWidth !== paneWidth) {
        onResizeEnd(draggedWidth)
      }
    }
    window.addEventListener("pointermove", followPointer)
    window.addEventListener("pointerup", stopDrag)
    window.addEventListener("pointercancel", stopDrag)
  }

  const widthForKey: Partial<Record<string, number>> = {
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
      aria-valuenow={paneWidth}
      aria-valuetext={`${paneWidth} pixels`}
      aria-valuemin={minimumWidth}
      aria-valuemax={maximumWidth}
      tabIndex={0}
      onPointerDown={startDrag}
      onKeyDown={resizeWithKeyboard}
      onDoubleClick={() => resizeTo(defaultWidth)}
      className="w-2 shrink-0 cursor-col-resize touch-none rounded-full transition-colors duration-120 ease-out hover:bg-border"
    />
  )
}
