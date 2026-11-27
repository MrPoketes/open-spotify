import { Effect, Stream } from "effect"
import { use, useState, type KeyboardEvent } from "react"
import { clamp } from "../../lib/clamp"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { useStreamValue } from "../../lib/use-stream-value"
import { Slider } from "../../ui/slider"
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
// and every request counts against Spotify's rate limit. The slider commits a
// drag once the thumb is let go, and a key once it comes back up.
function useSeekOnRelease(progress: PlaybackProgress | null, onSeek: (positionMs: number) => void) {
  const [held, setHeld] = useState<HeldPosition | null>(null)

  const hold = (positionMs: number) => setHeld({ status: "holding", positionMs })
  const seekTo = (positionMs: number) => {
    setHeld({ status: "released", positionMs, progressAtRelease: progress })
    onSeek(positionMs)
  }
  const release = () => {
    if (held?.status === "holding") {
      seekTo(held.positionMs)
    }
  }

  const isShown =
    held?.status === "holding" || (held !== null && held.progressAtRelease === progress)
  return {
    heldPositionMs: isShown ? held.positionMs : null,
    isHolding: held?.status === "holding",
    hold,
    seekTo,
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
  const { heldPositionMs, isHolding, hold, seekTo, release } = useSeekOnRelease(
    progress,
    (positionMs) => {
      if (reason === null) {
        onSeek(positionMs)
      }
    },
  )
  const { positionMs, durationMs } = progress ?? noProgress
  const shownPositionMs = heldPositionMs ?? positionMs

  // The Player steps from the position of every seek it has sent, which the
  // slider may not show yet: a progress worked out before a seek can arrive
  // after it.
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
    // Like the shortcuts, a new hold starts from the Player's position, which
    // counts the last seek even while the slider still shows an older one.
    const stepStart = isHolding
      ? { positionMs: shownPositionMs, durationMs }
      : runtime.runSync(playbackPosition)
    if (stepStart !== null) {
      hold(clamp(target(stepStart), 0, stepStart.durationMs))
    }
  }

  return (
    <div className="flex w-[40vw] max-w-xl items-center gap-2 text-xs text-muted tabular-nums">
      <span aria-hidden className="min-w-10 text-right">
        {progress === null ? "-:--" : formatTrackDuration(shownPositionMs)}
      </span>
      <Slider
        label="Playback position"
        unavailableReason={reason}
        valueText={
          progress === null
            ? undefined
            : `${formatTrackDuration(shownPositionMs)} of ${formatTrackDuration(durationMs)}`
        }
        // Base UI refuses a max equal to its min, and with nothing playing the
        // duration is 0.
        max={Math.max(durationMs, 1)}
        step={1000}
        value={shownPositionMs}
        onValueChange={hold}
        onValueCommitted={seekTo}
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
