import { Link } from "@tanstack/react-router"
import { ArtworkSummary } from "../../ui/artwork-summary"
import { ArtistLinks } from "../artist/artist-links"
import type { PlayableItem } from "../spotify/spotify-playable-item"
import { playableItemByline, playableItemSummaryArtwork } from "./playable-item-description"

const titleLinkClassName = "hover:underline"

interface NowPlayingItemSummaryProps {
  readonly item: PlayableItem
}

// What plays, with links to the pages it belongs to.
export function NowPlayingItemSummary({ item }: NowPlayingItemSummaryProps) {
  return (
    <ArtworkSummary
      size="lead"
      artwork={playableItemSummaryArtwork(item)}
      title={<NowPlayingTitle item={item} />}
      details={
        item.type === "track" ? <ArtistLinks artists={item.artists} /> : playableItemByline(item)
      }
    />
  )
}

// Local files have no album page, so their title stays plain text.
function NowPlayingTitle({ item }: NowPlayingItemSummaryProps) {
  if (item.type === "episode") {
    return (
      <Link to="/show/$showId" params={{ showId: item.show.id }} className={titleLinkClassName}>
        {item.name}
      </Link>
    )
  }
  if (item.album.id === null) {
    return item.name
  }
  return (
    <Link to="/album/$albumId" params={{ albumId: item.album.id }} className={titleLinkClassName}>
      {item.name}
    </Link>
  )
}
