import { Disc3, ListMusic } from "lucide-react"
import { CardGrid, type GridCard } from "../../ui/card-grid"
import { artistCard } from "../artist/artist-card"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"
import type { SearchAlbum } from "../spotify/spotify-album"
import type { SearchResults } from "../spotify/spotify-search"
import { UndatedTrackList } from "../track-list/undated-track-list"
import { ResultSection } from "./result-section"

const albumCard = (album: SearchAlbum): GridCard => ({
  key: album.id,
  link: { to: "/album/$albumId", params: { albumId: album.id } },
  title: album.name,
  details: formatArtistNames(album.artists),
  artwork: album.images,
  placeholderIcon: Disc3,
})

const playlistCard = (playlist: SimplifiedPlaylist): GridCard => ({
  key: playlist.id,
  link: { to: "/playlist/$playlistId", params: { playlistId: playlist.id } },
  title: playlist.name,
  details: `By ${playlist.owner.displayName ?? playlist.owner.id}`,
  artwork: playlist.images ?? [],
  placeholderIcon: ListMusic,
})

interface SearchResultSectionsProps {
  readonly query: string
  readonly firstPages: SearchResults
}

export function SearchResultSections({ query, firstPages }: SearchResultSectionsProps) {
  return (
    <>
      <ResultSection
        query={query}
        title="Tracks"
        type="track"
        firstPage={firstPages.tracks}
        pageOf={({ tracks }) => tracks}
      >
        {(tracks) => <UndatedTrackList label="Tracks" tracks={tracks} />}
      </ResultSection>
      <ResultSection
        query={query}
        title="Artists"
        type="artist"
        firstPage={firstPages.artists}
        pageOf={({ artists }) => artists}
      >
        {(artists) => <CardGrid label="Artists" cards={artists.map(artistCard)} />}
      </ResultSection>
      <ResultSection
        query={query}
        title="Albums"
        type="album"
        firstPage={firstPages.albums}
        pageOf={({ albums }) => albums}
      >
        {(albums) => <CardGrid label="Albums" cards={albums.map(albumCard)} />}
      </ResultSection>
      <ResultSection
        query={query}
        title="Playlists"
        type="playlist"
        firstPage={firstPages.playlists}
        pageOf={({ playlists }) => playlists}
      >
        {(playlists) => <CardGrid label="Playlists" cards={playlists.map(playlistCard)} />}
      </ResultSection>
    </>
  )
}
