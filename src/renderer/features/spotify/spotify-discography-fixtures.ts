import type { AlbumGroup } from "./spotify-artist-requests"
import { coverUrl, fakeAlbums } from "./spotify-fixtures"

type FakeFullAlbum = (typeof fakeAlbums)[number]

const albumInDiscography = ({ tracks: _tracks, ...album }: FakeFullAlbum) => album

const northboundStatic = { id: "fake-artist-0", name: "Northbound Static" }

const albumsByIds = (albumIds: ReadonlyArray<string>) =>
  fakeAlbums.filter(({ id }) => albumIds.includes(id)).map(albumInDiscography)

interface InventedRelease {
  readonly id: string
  readonly name: string
  readonly albumType: "album" | "single"
  readonly year: number
}

const inventedRelease = ({ id, name, albumType, year }: InventedRelease) => ({
  id,
  name,
  images: [{ url: coverUrl(id), width: 640, height: 640 }],
  artists: [northboundStatic],
  uri: `spotify:album:${id}`,
  album_type: albumType,
  release_date: String(year),
  release_date_precision: "year",
  total_tracks: 10,
  type: "album",
})

// Northbound Static has more albums than fit on one page, so "Show all" has
// to load another.
const northboundStaticDiscography: Record<AlbumGroup, ReadonlyArray<unknown>> = {
  album: [
    ...albumsByIds(["fake-album-0"]),
    ...Array.from({ length: 13 }, (_, index) =>
      inventedRelease({
        id: `fake-artist-0-album-${index}`,
        name: `Coastline Sessions, vol. ${index + 1}`,
        albumType: "album",
        year: 2018 - index,
      }),
    ),
  ],
  single: Array.from({ length: 3 }, (_, index) =>
    inventedRelease({
      id: `fake-artist-0-single-${index}`,
      name: `Antenna ${index + 1}`,
      albumType: "single",
      year: 2020 + index,
    }),
  ),
  appears_on: albumsByIds(["fake-album-2", "fake-album-5"]),
}

// Every other artist released only the album they are credited on, if any.
export const fakeDiscography = (artistId: string): Record<AlbumGroup, ReadonlyArray<unknown>> => {
  if (artistId === northboundStatic.id) {
    return northboundStaticDiscography
  }
  const ownAlbums = fakeAlbums.filter(({ artists }) => artists.some(({ id }) => id === artistId))
  return { album: ownAlbums.map(albumInDiscography), single: [], appears_on: [] }
}
