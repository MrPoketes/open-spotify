import { CardGrid, type GridCard } from "../../ui/card-grid"
import { artistCard } from "../artist/artist-card"
import { useWithFolderMenu } from "../folders/use-with-folder-menu"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { SearchAlbum } from "../spotify/spotify-album"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"
import type { SearchResults } from "../spotify/spotify-search"
import { UndatedTrackList } from "../track-list/undated-track-list"
import { ResultSection } from "./result-section"

const albumCard = (album: SearchAlbum): GridCard => ({
  key: album.id,
  link: { to: "/album/$albumId", params: { albumId: album.id } },
  title: album.name,
  details: formatArtistNames(album.artists),
  artwork: album.images,
  placeholderIcon: spotifyItemKinds.album.icon,
})

const playlistCard = (playlist: SimplifiedPlaylist): GridCard => ({
  key: playlist.id,
  link: { to: "/playlist/$playlistId", params: { playlistId: playlist.id } },
  title: playlist.name,
  details: `By ${playlist.owner.displayName ?? playlist.owner.id}`,
  artwork: playlist.images ?? [],
  placeholderIcon: spotifyItemKinds.playlist.icon,
})

interface SearchResultSectionsProps {
  readonly query: string
  readonly firstPages: SearchResults
}

export function SearchResultSections({ query, firstPages }: SearchResultSectionsProps) {
  const withFolderMenu = useWithFolderMenu()
  return (
    <>
      <ResultSection
        query={query}
        title="Tracks"
        type="track"
        firstPage={firstPages.tracks}
        pageOf={({ tracks }) => tracks}
      >
        {(tracks, rowFocusRef) => (
          <UndatedTrackList label="Tracks" tracks={tracks} rowFocusRef={rowFocusRef} />
        )}
      </ResultSection>
      <ResultSection
        query={query}
        title="Artists"
        type="artist"
        firstPage={firstPages.artists}
        pageOf={({ artists }) => artists}
      >
        {(artists, rowFocusRef) => (
          <CardGrid
            label="Artists"
            cards={artists.map((artist) => withFolderMenu(artistCard(artist), artist.uri))}
            rowFocusRef={rowFocusRef}
          />
        )}
      </ResultSection>
      <ResultSection
        query={query}
        title="Albums"
        type="album"
        firstPage={firstPages.albums}
        pageOf={({ albums }) => albums}
      >
        {(albums, rowFocusRef) => (
          <CardGrid
            label="Albums"
            cards={albums.map((album) => withFolderMenu(albumCard(album), album.uri))}
            rowFocusRef={rowFocusRef}
          />
        )}
      </ResultSection>
      <ResultSection
        query={query}
        title="Playlists"
        type="playlist"
        firstPage={firstPages.playlists}
        pageOf={({ playlists }) => playlists}
      >
        {(playlists, rowFocusRef) => (
          <CardGrid
            label="Playlists"
            cards={playlists.map((playlist) =>
              withFolderMenu(playlistCard(playlist), playlist.uri),
            )}
            rowFocusRef={rowFocusRef}
          />
        )}
      </ResultSection>
    </>
  )
}
