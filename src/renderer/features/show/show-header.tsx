import { Radio } from "lucide-react"
import { Artwork } from "../../ui/artwork"
import type { Show } from "../spotify/spotify-show"

export function ShowHeader({ show }: { readonly show: Show }) {
  return (
    <header className="flex items-end gap-6">
      <Artwork
        sources={show.images}
        size={192}
        className="rounded-medium"
        placeholderIcon={Radio}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold text-muted">Podcast</p>
        <h1 className="font-display text-5xl font-bold">{show.name}</h1>
        <p className="text-muted">{show.description}</p>
      </div>
    </header>
  )
}
