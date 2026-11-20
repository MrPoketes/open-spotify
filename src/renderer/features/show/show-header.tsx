import { Radio } from "lucide-react"
import { useState } from "react"
import type { Show } from "../spotify/spotify-show"

function ShowCover({ show }: { readonly show: Show }) {
  const [coverFailed, setCoverFailed] = useState(false)
  // Spotify lists a show's images widest first.
  const [widestImage] = show.images

  if (widestImage === undefined || coverFailed) {
    return (
      <div className="flex size-48 shrink-0 items-center justify-center rounded-medium bg-surface-raised text-muted">
        <Radio aria-hidden size={64} />
      </div>
    )
  }
  return (
    <img
      src={widestImage.url}
      alt=""
      onError={() => setCoverFailed(true)}
      className="size-48 shrink-0 rounded-medium object-cover"
    />
  )
}

export function ShowHeader({ show }: { readonly show: Show }) {
  return (
    <header className="flex items-end gap-6">
      <ShowCover show={show} />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold text-muted">Podcast</p>
        <h1 className="font-display text-5xl font-bold">{show.name}</h1>
        <p className="text-muted">{show.description}</p>
      </div>
    </header>
  )
}
