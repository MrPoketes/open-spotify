import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { useCallback, type KeyboardEvent } from "react"
import { cn } from "./class-names"
import { hasShortcutModifier } from "./has-shortcut-modifier"

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
  // Fires once a pointer lets go of the thumb or the rail.
  readonly onValueCommitted?: (value: number) => void
  readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  readonly onKeyUp?: () => void
  readonly onBlur?: () => void
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

  // Base UI's thumb passes only a few attributes on to the range input that
  // takes focus. aria-disabled instead of disabled keeps the slider focusable,
  // like the playback controls, and the title says why it is off, which also
  // makes it the accessible description.
  const describeAvailability = useCallback(
    (input: HTMLInputElement | null) => {
      if (input === null) {
        return
      }
      input.title = unavailableReason ?? label
      input.setAttribute("aria-disabled", String(unavailableReason !== null))
    },
    [label, unavailableReason],
  )

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
      title={unavailableReason ?? label}
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
    </SliderPrimitive.Root>
  )
}
