import { use, useId } from "react"
import { PlayOnThisComputerContext } from "./play-on-this-computer-context"

export function PlayOnThisComputerSetting() {
  const { playOnThisComputer, choosePlayOnThisComputer } = use(PlayOnThisComputerContext)
  const labelId = useId()
  const descriptionId = useId()
  const trackStyle = playOnThisComputer ? "bg-accent" : "bg-muted"
  const thumbStyle = playOnThisComputer ? "translate-x-4 bg-on-accent" : "bg-surface"

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <span id={labelId} className="text-sm font-semibold">
          Play on this computer
        </span>
        <p id={descriptionId} className="text-xs text-muted">
          Lists this computer in the device picker, so Spotify can play here without the official
          app. When it is off, Open Spotify only controls your other devices.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={playOnThisComputer}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onClick={() => choosePlayOnThisComputer(!playOnThisComputer)}
        className={`flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition-colors duration-120 ease-out ${trackStyle}`}
      >
        <span
          aria-hidden
          className={`size-4 rounded-full transition-transform duration-120 ease-out ${thumbStyle}`}
        />
      </button>
    </div>
  )
}
