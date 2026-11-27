import { formatCount } from "../../ui/format-count"
import { PageHeader } from "../../ui/page-header"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import { likedSongsCover } from "./liked-songs-cover"

interface LikedSongsHeaderProps {
  readonly songCount: number
  // Null when there are no songs to add up.
  readonly totalDuration: string | null
}

export function LikedSongsHeader({ songCount, totalDuration }: LikedSongsHeaderProps) {
  const details = [formatCount(songCount, "song", "songs"), totalDuration].filter(
    (detail) => detail !== null,
  )
  return (
    <PageHeader
      kind={spotifyItemKinds.playlist.label}
      title="Liked Songs"
      cover={likedSongsCover}
      details={details}
    />
  )
}
