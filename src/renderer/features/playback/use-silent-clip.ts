import { Effect, Fiber, Schema } from "effect"
import { use, useEffect, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"

class SilentClipPlayError extends Schema.TaggedError<SilentClipPlayError>()("SilentClipPlayError", {
  cause: Schema.Defect(),
}) {}

const sampleRate = 8000
const headerLength = 44

const writeText = (view: DataView, offset: number, text: string) => {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}

// One second of 8-bit mono PCM in a WAV file, built here so the app ships no
// audio file. After "RIFF" the header holds the file's remaining size, the
// format chunk (its size, PCM, one channel, the sample rate, the byte rate,
// the bytes per sample, and the bits per sample), and the data chunk's size.
const makeSilentClipUrl = () => {
  const bytes = new Uint8Array(headerLength + sampleRate)
  const view = new DataView(bytes.buffer)
  writeText(view, 0, "RIFF")
  view.setUint32(4, bytes.length - 8, true)
  writeText(view, 8, "WAVEfmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  writeText(view, 36, "data")
  view.setUint32(40, sampleRate, true)
  // 8-bit samples are unsigned, so silence is the middle value.
  bytes.fill(128, headerLength)
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`
}

const playThenFollow = (clip: HTMLAudioElement, isPlaying: boolean) =>
  Effect.tryPromise({
    try: () => clip.play(),
    catch: (cause) => new SilentClipPlayError({ cause }),
  }).pipe(
    Effect.andThen(
      Effect.sync(() => {
        if (!isPlaying) {
          clip.pause()
        }
      }),
    ),
    Effect.catch((error) => Effect.logWarning("The silent clip for media keys didn't play", error)),
  )

const silentClipUrl = makeSilentClipUrl()

const makeSilentClip = () => {
  const clip = new Audio()
  clip.loop = true
  clip.volume = 0
  return clip
}

// Chromium sends media keys to a page, and shows it in the operating system's
// media overlay, only while the page has a media player. Spotify Connect plays
// the audio elsewhere, so a looping silent clip stands in for one. A muted
// clip does not count, but one at volume 0 does. The clip plays once even
// when Spotify is paused, because a clip that never played creates no player
// and the play key would do nothing.
export function useSilentClip(isActive: boolean, isPlaying: boolean) {
  const runtime = use(RendererRuntimeContext)
  const [clip] = useState(makeSilentClip)

  useEffect(() => {
    if (!isActive) {
      return undefined
    }
    clip.setAttribute("src", silentClipUrl)
    return () => {
      clip.pause()
      // A clip with no source leaves no player behind, so the operating
      // system stops showing the app.
      clip.removeAttribute("src")
      clip.load()
    }
  }, [clip, isActive])

  useEffect(() => {
    if (!isActive) {
      return undefined
    }
    const following = runtime.runFork(playThenFollow(clip, isPlaying))
    return () => {
      runtime.runFork(Fiber.interrupt(following))
    }
  }, [runtime, clip, isActive, isPlaying])
}
