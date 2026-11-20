import { Radio } from "lucide-react"
import { PageHeader } from "../../ui/page-header"
import type { Show } from "../spotify/spotify-show"

export function ShowHeader({ show }: { readonly show: Show }) {
  return (
    <PageHeader
      kind="Podcast"
      title={show.name}
      cover={{ sources: show.images, placeholderIcon: Radio }}
    >
      <p className="text-muted">{show.description}</p>
    </PageHeader>
  )
}
