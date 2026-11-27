import type { InputHTMLAttributes, KeyboardEvent, Ref } from "react"
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

type RangeSliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  // How much of the rail the accent fills, from 0 to 1.
  readonly filledFraction: number
  readonly ref?: Ref<HTMLInputElement>
}

// A range input that fills the width of its container. Chromium draws the
// native range rail in its own colors, so the input is transparent over a
// rail drawn from theme tokens. An aria-disabled slider dims, like the
// playback controls.
export function RangeSlider({ filledFraction, onKeyDown, ref, ...inputProps }: RangeSliderProps) {
  // Chromium steps a range input on these keys even with a modifier held,
  // which would move the slider on every repeat of a held Alt+Left. The
  // app-wide shortcuts still see the key.
  const leaveShortcutsAlone = (event: KeyboardEvent<HTMLInputElement>) => {
    if (steppingKeys.has(event.key) && hasShortcutModifier(event)) {
      event.preventDefault()
      return
    }
    onKeyDown?.(event)
  }

  return (
    <div className="relative flex h-4 min-w-0 flex-1 items-center has-aria-disabled:opacity-50">
      <div aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-accent" style={{ width: `${filledFraction * 100}%` }} />
      </div>
      <input
        ref={ref}
        type="range"
        {...inputProps}
        onKeyDown={leaveShortcutsAlone}
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent aria-disabled:cursor-default [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
      />
    </div>
  )
}
