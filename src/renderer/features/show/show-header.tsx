import { formatCount } from "../../ui/format-count"
import { PageHeader } from "../../ui/page-header"
import { useAddToFolder } from "../folders/use-add-to-folder"
import { ContextPlayButton } from "../playback/context-play-button"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import type { Show } from "../spotify/spotify-show"

interface ShowHeaderProps {
  readonly show: Show
  readonly episodeCount: number
}

export function ShowHeader({ show, episodeCount }: ShowHeaderProps) {
  const addToFolder = useAddToFolder()
  return (
    <PageHeader
      kind={spotifyItemKinds.show.label}
      title={show.name}
      cover={{ sources: show.images, placeholderIcon: spotifyItemKinds.show.icon }}
      details={[formatCount(episodeCount, "episode", "episodes")]}
      description={show.description}
      menuItems={[addToFolder(show)]}
      playButton={<ContextPlayButton contextUri={show.uri} contextName={show.name} />}
    />
  )
}
