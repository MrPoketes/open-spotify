import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { useCallback, useId, type KeyboardEvent } from "react"
import { cn } from "./class-names"
import { hasShortcutModifier } from "./has-shortcut-modifier"
import { Tooltip } from "./tooltip"

const steppingKeys = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
])

interface SliderProps {
  readonly label: string
  // What a screen reader reads for the value, such as "60%".
  readonly valueText: string | undefined
  // Why the slider cannot be used right now, or null when it can.
  readonly unavailableReason: string | null
  readonly max: number
  readonly step: number
  readonly value: number
  readonly onValueChange: (value: number) => void
  // Fires once a pointer lets go of the thumb or the rail, and on every step
  // Base UI takes itself: each arrow, page, Home, or End key the caller does
  // not prevent, and each change assistive technology makes.
  readonly onValueCommitted?: (value: number) => void
  readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  readonly onKeyUp?: () => void
  readonly onBlur?: () => void
}

// Base UI's thumb passes only a few attributes on to the range input that
// takes focus. aria-disabled instead of disabled keeps the slider focusable,
// like the playback controls, and a hidden copy of the reason the tooltip
// shows describes it.
function useAvailabilityDescription(unavailableReason: string | null) {
  const reasonId = useId()
  const describeAvailability = useCallback(
    (input: HTMLInputElement | null) => {
      if (input === null) {
        return
      }
      input.setAttribute("aria-disabled", String(unavailableReason !== null))
      if (unavailableReason === null) {
        input.removeAttribute("aria-describedby")
        return
      }
      input.setAttribute("aria-describedby", reasonId)
    },
    [reasonId, unavailableReason],
  )
  return { reasonId, describeAvailability }
}

// shadcn/ui's Slider, restyled to docs/design.md (Now-playing bar): a 4 px
// rail filled with the accent, and a thumb that shows on hover, focus, and
// drag. It runs from 0 to max with one thumb.
export function Slider({
  label,
  valueText,
  unavailableReason,
  onValueChange,
  onValueCommitted,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...range
}: SliderProps) {
  const isUnavailable = unavailableReason !== null
  const { reasonId, describeAvailability } = useAvailabilityDescription(unavailableReason)

  // Base UI and Chromium step a range input on these keys even with a
  // modifier held, which would move the slider on every repeat of a held
  // Alt+Left. Preventing the default stops both, and the app-wide shortcuts
  // still see the key.
  const leaveShortcutsAlone = (event: KeyboardEvent<HTMLInputElement>) => {
    if (steppingKeys.has(event.key) && hasShortcutModifier(event)) {
      event.preventDefault()
      return
    }
    onKeyDown?.(event)
  }

  return (
    <SliderPrimitive.Root
      {...range}
      min={0}
      onValueChange={(value) => {
        if (!isUnavailable) {
          onValueChange(value)
        }
      }}
      onValueCommitted={(value) => {
        if (!isUnavailable) {
          onValueCommitted?.(value)
        }
      }}
      className="group/slider w-full"
    >
      {/* The pointer rests on the control and the focus on the thumb inside
          it, so the control is what the tooltip opens from. */}
      <Tooltip label={label} details={unavailableReason}>
        <SliderPrimitive.Control
          className={cn(
            "relative flex h-4 w-full cursor-pointer touch-none items-center select-none",
            isUnavailable && "cursor-default opacity-50",
          )}
        >
          <SliderPrimitive.Track className="h-1 w-full overflow-hidden rounded-full bg-muted/35">
            <SliderPrimitive.Indicator className="h-full bg-accent" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            inputRef={describeAvailability}
            aria-label={label}
            aria-valuetext={valueText}
            onKeyDown={leaveShortcutsAlone}
            onKeyUp={onKeyUp}
            onBlur={onBlur}
            className={cn(
              "size-3 scale-0 rounded-full bg-foreground shadow-raised transition-transform duration-120 ease-out has-focus-visible:scale-100 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus data-dragging:scale-100",
              !isUnavailable && "group-hover/slider:scale-100",
            )}
          />
        </SliderPrimitive.Control>
      </Tooltip>
      <span id={reasonId} hidden>
        {unavailableReason}
      </span>
    </SliderPrimitive.Root>
  )
}
