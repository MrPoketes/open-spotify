import { PageHeader } from "../../ui/page-header"
import { useAddToFolder } from "../folders/use-add-to-folder"
import { ContextPlayButton } from "../playback/context-play-button"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import type { Show } from "../spotify/spotify-show"

export function ShowHeader({ show }: { readonly show: Show }) {
  const addToFolder = useAddToFolder()
  return (
    <PageHeader
      kind={spotifyItemKinds.show.label}
      title={show.name}
      cover={{ sources: show.images, placeholderIcon: spotifyItemKinds.show.icon }}
      menuItems={[addToFolder(show)]}
      playButton={<ContextPlayButton contextUri={show.uri} contextName={show.name} />}
    >
      <p className="text-muted">{show.description}</p>
    </PageHeader>
  )
}
