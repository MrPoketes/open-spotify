import { use, useMemo, useState, type ReactNode } from "react"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { saveSetting } from "../../lib/saved-setting"
import { TrackListDensityContext } from "./track-list-density-context"

interface TrackListDensityProviderProps {
  readonly savedDensity: TrackListDensity
  readonly children: ReactNode
}

// Every track list follows one density, so a choice made in Settings applies
// to the lists on every page at once.
export function TrackListDensityProvider({
  savedDensity,
  children,
}: TrackListDensityProviderProps) {
  const runtime = use(RendererRuntimeContext)
  const [density, setDensity] = useState(savedDensity)

  // Every track list reads this context, and a new value would re-render all
  // their rows whenever the app shell renders.
  const densityChoice = useMemo(
    () => ({
      density,
      chooseDensity: (nextDensity: TrackListDensity) => {
        setDensity(nextDensity)
        runtime.runFork(saveSetting("trackListDensity", nextDensity))
      },
    }),
    [density, runtime],
  )

  return <TrackListDensityContext value={densityChoice}>{children}</TrackListDensityContext>
}
