import { Effect } from "effect"
import { useId, useState } from "react"
import { Button } from "../../ui/button"
import { CardGrid, type GridCard } from "../../ui/card-grid"
import { PageSection } from "../../ui/page-section"
import { useCardGridColumnCount } from "../../ui/use-card-grid-column-count"
import { useWithFolderMenu } from "../folders/use-with-folder-menu"
import { NextPageFooter } from "../spotify/next-page-footer"
import type { ArtistAlbum, ArtistAlbumsPage } from "../spotify/spotify-album"
import { SpotifyApi } from "../spotify/spotify-api"
import type { AlbumGroup } from "../spotify/spotify-artist-requests"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import { scrollLoadedListControls, useLoadControlFocus } from "../spotify/use-load-control-focus"
import { useNextPages } from "../spotify/use-next-pages"

const albumCard = (album: ArtistAlbum): GridCard => ({
  key: album.id,
  link: { to: "/album/$albumId", params: { albumId: album.id } },
  title: album.name,
  // Release dates start with the year, whatever their precision.
  details: album.releaseDate.slice(0, 4),
  artwork: album.images,
  placeholderIcon: spotifyItemKinds.album.icon,
})

interface DiscographySectionProps {
  readonly title: string
  readonly artistId: string
  readonly albumGroup: AlbumGroup
  readonly firstPage: ArtistAlbumsPage
}

// One row of cards until "Show all" reveals the rest, which load page by page
// as the end of the grid scrolls into view.
export function DiscographySection({
  title,
  artistId,
  albumGroup,
  firstPage,
}: DiscographySectionProps) {
  const gridId = useId()
  const [isExpanded, setIsExpanded] = useState(false)
  const { gridRef, columnCount } = useCardGridColumnCount()
  const withFolderMenu = useWithFolderMenu()
  const loadPage = Effect.fn("DiscographySection.loadPage")(function* (offset: number) {
    const spotify = yield* SpotifyApi
    return yield* spotify.getArtistAlbumsPage(artistId, albumGroup, offset)
  })
  const {
    items: albums,
    nextOffset,
    nextPage,
    loadNextPage,
  } = useNextPages({ firstPage, loadPage })
  const shownAlbums = isExpanded ? albums : albums.slice(0, columnCount)
  // Collapsed, the grid loads a page only to fill its one row, so the first
  // album a page adds is always shown.
  const { retryRef, resultRowsRef } = useLoadControlFocus(
    scrollLoadedListControls[nextPage.status],
    shownAlbums.length,
  )
  // A wide pane can fit more cards on a row than one page holds.
  const needsMoreAlbums = isExpanded || albums.length < columnCount

  return (
    <PageSection
      title={title}
      controls={
        firstPage.total > columnCount ? (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            aria-controls={gridId}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show fewer" : "Show all"}
          </Button>
        ) : null
      }
    >
      <CardGrid
        id={gridId}
        ref={gridRef}
        label={title}
        cards={shownAlbums.map((album) => withFolderMenu(albumCard(album), album.uri))}
        rowFocusRef={resultRowsRef}
      />
      <NextPageFooter
        kind="releases"
        nextPage={nextPage}
        loadNextPage={loadNextPage}
        wantsNextPage={needsMoreAlbums && nextOffset !== null}
        retryRef={retryRef}
      />
    </PageSection>
  )
}
