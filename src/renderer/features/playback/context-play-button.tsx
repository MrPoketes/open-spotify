import { Pause, Play } from "lucide-react"
import { useNowPlaying } from "./use-now-playing"
import { usePlayerCommandFromPage } from "./use-player-command-from-page"

interface ContextPlayButtonProps {
  // An album, artist, playlist, or show.
  readonly contextUri: string
  // Completes the button's name, as in "Play Late Night Drive".
  readonly contextName: string
}

// Starts the context from its beginning. While the context plays, the button
// pauses it instead, and while it is paused, resumes it where it stopped.
export function ContextPlayButton({ contextUri, contextName }: ContextPlayButtonProps) {
  const nowPlaying = useNowPlaying()
  const sendCommand = usePlayerCommandFromPage()
  const isCurrentContext = nowPlaying !== null && nowPlaying.contextUri === contextUri
  const isPlaying = isCurrentContext && nowPlaying.isPlaying

  const press = () => {
    if (isPlaying) {
      sendCommand((player) => player.pause, "Couldn't pause playback.")
      return
    }
    if (isCurrentContext) {
      sendCommand((player) => player.play, "Couldn't resume playback.")
      return
    }
    sendCommand((player) => player.startPlayback({ contextUri }), `Couldn't play ${contextName}.`)
  }

  const Icon = isPlaying ? Pause : Play
  return (
    <button
      type="button"
      aria-label={`${isPlaying ? "Pause" : "Play"} ${contextName}`}
      onClick={press}
      className="flex size-14 items-center justify-center self-start rounded-full bg-accent text-on-accent transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75"
    >
      <Icon aria-hidden size={24} fill="currentColor" />
    </button>
  )
}
