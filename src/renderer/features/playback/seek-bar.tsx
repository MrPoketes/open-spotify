import { Effect, Stream } from "effect"
import { type KeyboardEvent, use, useEffect, useEffectEvent, useState } from "react"
import { clamp } from "../../lib/clamp"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { useStreamValue } from "../../lib/use-stream-value"
import { RangeSlider } from "../../ui/range-slider"
import { formatTrackDuration } from "../track-list/format-duration"
import type { PlaybackProgress } from "./playback-progress"
import { Player } from "./player"
import { usePlaybackShortcut } from "./use-playback-shortcut"

const playbackProgress = Stream.unwrap(
  Effect.gen(function* () {
    const player = yield* Player
    return player.progress
  }),
)

const playbackPosition = Effect.gen(function* () {
  const player = yield* Player
  return yield* player.position
})

const seekStepMs = 5000

// A tenth of the item, so a page step stays useful in a long podcast episode.
// Rounded, because Spotify takes only whole milliseconds.
const pageStepMs = (durationMs: number) => Math.round(durationMs / 10)

const keyboardTargets: Record<string, (progress: PlaybackProgress) => number> = {
  ArrowLeft: ({ positionMs }) => positionMs - seekStepMs,
  ArrowDown: ({ positionMs }) => positionMs - seekStepMs,
  ArrowRight: ({ positionMs }) => positionMs + seekStepMs,
  ArrowUp: ({ positionMs }) => positionMs + seekStepMs,
  PageDown: ({ positionMs, durationMs }) => positionMs - pageStepMs(durationMs),
  PageUp: ({ positionMs, durationMs }) => positionMs + pageStepMs(durationMs),
  Home: () => 0,
  End: ({ durationMs }) => durationMs,
}

const noProgress: PlaybackProgress = { positionMs: 0, durationMs: 0 }

// Where the user moves the slider to with the pointer or the arrow keys.
type HeldPosition =
  | { readonly status: "holding"; readonly positionMs: number }
  // The seek is on its way. The position stays until the next progress
  // arrives, so the slider does not flick back to where playback was.
  | {
      readonly status: "released"
      readonly positionMs: number
      readonly progressAtRelease: PlaybackProgress | null
    }

// While the user drags the thumb or holds down a key, the slider follows them,
// and it seeks once they let go: a held key repeats about 30 times a second,
// and every request counts against Spotify's rate limit. The native change
// event fires once the thumb is let go, while React's onChange fires on every
// step of the drag.
function useSeekOnRelease(progress: PlaybackProgress | null, onSeek: (positionMs: number) => void) {
  const [slider, setSlider] = useState<HTMLInputElement | null>(null)
  const [held, setHeld] = useState<HeldPosition | null>(null)

  const hold = (positionMs: number) => setHeld({ status: "holding", positionMs })
  const release = () => {
    if (held?.status === "holding") {
      setHeld({ status: "released", positionMs: held.positionMs, progressAtRelease: progress })
      onSeek(held.positionMs)
    }
  }
  const releaseThumb = useEffectEvent(release)

  useEffect(() => {
    if (slider === null) {
      return undefined
    }
    const seekToThumb = () => releaseThumb()
    slider.addEventListener("change", seekToThumb)
    return () => slider.removeEventListener("change", seekToThumb)
  }, [slider])

  const isShown =
    held?.status === "holding" || (held !== null && held.progressAtRelease === progress)
  return {
    sliderRef: setSlider,
    heldPositionMs: isShown ? held.positionMs : null,
    isHolding: held?.status === "holding",
    hold,
    release,
  }
}

interface SeekBarProps {
  // Why the playback controls cannot be used right now, or null when they can.
  readonly unavailableReason: string | null
  readonly onSeek: (positionMs: number) => void
  readonly onSeekBy: (offsetMs: number) => void
}

// aria-disabled instead of disabled keeps the slider focusable, like the
// other playback controls, and its title says why it is off.
export function SeekBar({ unavailableReason, onSeek, onSeekBy }: SeekBarProps) {
  const runtime = use(RendererRuntimeContext)
  const progress = useStreamValue(playbackProgress, null)
  const reason = unavailableReason ?? (progress === null ? "Nothing is playing." : null)
  const { sliderRef, heldPositionMs, isHolding, hold, release } = useSeekOnRelease(
    progress,
    (positionMs) => {
      if (reason === null) {
        onSeek(positionMs)
      }
    },
  )
  const { positionMs, durationMs } = progress ?? noProgress
  const shownPositionMs = heldPositionMs ?? positionMs

  // The Player counts every seek it has sent, which the slider may not show
  // yet: a progress worked out before a seek can arrive after it. So the
  // shortcuts, and the first key press of a hold, step from the Player's
  // position.
  const seekShortcut = (offsetMs: number) => ({
    unavailableReason: reason,
    run: () => onSeekBy(offsetMs),
  })
  usePlaybackShortcut("seekForward", seekShortcut(seekStepMs))
  usePlaybackShortcut("seekBack", seekShortcut(-seekStepMs))

  const stepFromKeyboard = (event: KeyboardEvent<HTMLInputElement>) => {
    const target = keyboardTargets[event.key]
    if (target === undefined) {
      return
    }
    event.preventDefault()
    if (reason !== null) {
      return
    }
    const from = isHolding
      ? { positionMs: shownPositionMs, durationMs }
      : runtime.runSync(playbackPosition)
    if (from !== null) {
      hold(clamp(target(from), 0, from.durationMs))
    }
  }

  const elapsedFraction = durationMs === 0 ? 0 : shownPositionMs / durationMs

  return (
    <div className="flex w-[40vw] max-w-xl items-center gap-2 text-xs text-muted tabular-nums">
      <span aria-hidden className="min-w-10 text-right">
        {progress === null ? "-:--" : formatTrackDuration(shownPositionMs)}
      </span>
      <RangeSlider
        ref={sliderRef}
        filledFraction={elapsedFraction}
        aria-label="Playback position"
        title={reason ?? "Playback position"}
        aria-disabled={reason !== null}
        aria-valuetext={
          progress === null
            ? undefined
            : `${formatTrackDuration(shownPositionMs)} of ${formatTrackDuration(durationMs)}`
        }
        min={0}
        max={durationMs}
        step={1000}
        value={shownPositionMs}
        onChange={(event) => {
          if (reason === null) {
            hold(event.target.valueAsNumber)
          }
        }}
        onKeyDown={stepFromKeyboard}
        onKeyUp={release}
        onBlur={release}
      />
      <span aria-hidden className="min-w-10">
        {progress === null ? "-:--" : formatTrackDuration(durationMs)}
      </span>
    </div>
  )
}
