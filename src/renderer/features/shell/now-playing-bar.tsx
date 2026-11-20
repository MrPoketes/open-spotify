import { MonitorSpeaker } from "lucide-react"

export function NowPlayingBar() {
  return (
    <section
      aria-label="Now playing"
      className="flex h-18 shrink-0 items-center justify-between gap-4 rounded-medium bg-surface-raised px-4 shadow-raised"
    >
      <p className="text-sm text-muted">Nothing is playing</p>
      <p className="flex items-center gap-1 text-xs text-muted">
        <MonitorSpeaker aria-hidden size={16} />
        No active device
      </p>
    </section>
  )
}
