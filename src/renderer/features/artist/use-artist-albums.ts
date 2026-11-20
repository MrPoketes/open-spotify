import { Effect } from "effect"
import { use, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import type { ArtistAlbum, ArtistAlbumsPage } from "../spotify/spotify-album"
import { type AlbumGroup, SpotifyApi } from "../spotify/spotify-api"

type NextPageStatus = "idle" | "loading" | "failed"

interface ArtistAlbums {
  readonly albums: ReadonlyArray<ArtistAlbum>
  // Null once the last page has loaded.
  readonly nextOffset: number | null
  readonly nextPage: NextPageStatus
}

const offsetAfter = (page: ArtistAlbumsPage, offset: number) =>
  page.next === null ? null : offset + page.items.length

interface ArtistAlbumsOptions {
  readonly artistId: string
  readonly albumGroup: AlbumGroup
  readonly firstPage: ArtistAlbumsPage
}

// The albums of one part of an artist's discography, starting from the first
// page and loading the next one when asked.
export function useArtistAlbums({ artistId, albumGroup, firstPage }: ArtistAlbumsOptions) {
  const runtime = use(RendererRuntimeContext)
  const [artistAlbums, setArtistAlbums] = useState<ArtistAlbums>(() => ({
    albums: firstPage.items,
    nextOffset: offsetAfter(firstPage, 0),
    nextPage: "idle",
  }))

  const loadNextPage = () => {
    const { nextOffset, nextPage } = artistAlbums
    if (nextOffset === null || nextPage === "loading") {
      return
    }
    setArtistAlbums((current) => ({ ...current, nextPage: "loading" }))
    const showPage = (page: ArtistAlbumsPage) =>
      Effect.sync(() =>
        setArtistAlbums((current) => ({
          albums: [...current.albums, ...page.items],
          nextOffset: offsetAfter(page, nextOffset),
          nextPage: "idle",
        })),
      )
    const showFailure = Effect.sync(() =>
      setArtistAlbums((current) => ({ ...current, nextPage: "failed" })),
    )
    const load = Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      return yield* spotify.getArtistAlbumsPage(artistId, albumGroup, nextOffset)
    }).pipe(
      Effect.tapError((error) => Effect.logWarning("Could not load albums", artistId, error)),
      Effect.matchEffect({ onFailure: () => showFailure, onSuccess: showPage }),
    )
    runtime.runFork(load)
  }

  return { ...artistAlbums, loadNextPage }
}
