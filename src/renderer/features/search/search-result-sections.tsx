import { Disc3, ListMusic, MicVocal } from "lucide-react"
import { CardGrid, type GridCard } from "../../ui/card-grid"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { Artist } from "../spotify/spotify-artist"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"
import type { SearchAlbum } from "../spotify/spotify-album"
import type { SearchResults } from "../spotify/spotify-search"
import type { Track } from "../spotify/spotify-track"
import { trackEntry } from "../track-list/track-entry"
import { TrackList } from "../track-list/track-list"
import { ResultSection } from "./result-section"

const artistCard = (artist: Artist): GridCard => ({
  key: artist.id,
  link: { to: "/artist/$artistId", params: { artistId: artist.id } },
  title: artist.name,
  details: "Artist",
  artwork: artist.images,
  placeholderIcon: MicVocal,
  roundArtwork: true,
})

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

function TrackResults({ tracks }: { readonly tracks: ReadonlyArray<Track> }) {
  const trackAt = (index: number) => {
    const track = tracks[index]
    return track === undefined ? undefined : trackEntry(track, null)
  }
  return <TrackList label="Tracks" layout="search" trackCount={tracks.length} trackAt={trackAt} />
}

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
        {(tracks) => <TrackResults tracks={tracks} />}
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
