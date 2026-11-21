import { fakeAlbums, fakeLikedSongs } from "./spotify-fixtures"

// Every track the fake serves on its own. An album's tracks leave out the
// album, which a track on its own carries.
export const fakeTracks = [
  ...fakeAlbums.flatMap(({ tracks, ...album }) => tracks.map((track) => ({ ...track, album }))),
  ...fakeLikedSongs.map(({ track }) => track),
]
