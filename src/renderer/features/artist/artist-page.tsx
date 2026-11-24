import { Effect } from "effect"
import { LoadedSpotifyItem } from "../spotify/loaded-spotify-item"
import { SpotifyApi } from "../spotify/spotify-api"
import type { AlbumGroup } from "../spotify/spotify-artist-requests"
import { ArtistHeader } from "./artist-header"
import { DiscographySection } from "./discography-section"

const discographyParts: ReadonlyArray<{ readonly albumGroup: AlbumGroup; readonly title: string }> =
  [
    { albumGroup: "album", title: "Albums" },
    { albumGroup: "single", title: "Singles and EPs" },
    { albumGroup: "appears_on", title: "Appears On" },
  ]

// The first page of each part tells whether it has any albums, so that empty
// parts never show up and then disappear.
const loadArtist = Effect.fn("loadArtist")(function* (artistId: string) {
  const spotify = yield* SpotifyApi
  return yield* Effect.all(
    {
      artist: spotify.getArtist(artistId),
      discography: Effect.forEach(
        discographyParts,
        (part) =>
          spotify
            .getArtistAlbumsPage(artistId, part.albumGroup, 0)
            .pipe(Effect.map((firstPage) => ({ ...part, firstPage }))),
        { concurrency: "unbounded" },
      ),
    },
    { concurrency: "unbounded" },
  )
})

export function ArtistPage({ artistId }: { readonly artistId: string }) {
  return (
    <LoadedSpotifyItem kind="artist" load={loadArtist(artistId)}>
      {({ artist, discography }) => {
        const parts = discography.filter(({ firstPage }) => firstPage.total > 0)
        return (
          <div className="flex flex-col gap-8">
            <ArtistHeader artist={artist} />
            {parts.length === 0 ? (
              <p className="text-muted">Spotify lists no releases for this artist.</p>
            ) : null}
            {parts.map(({ albumGroup, title, firstPage }) => (
              <DiscographySection
                key={albumGroup}
                title={title}
                artistId={artist.id}
                albumGroup={albumGroup}
                firstPage={firstPage}
              />
            ))}
          </div>
        )
      }}
    </LoadedSpotifyItem>
  )
}
