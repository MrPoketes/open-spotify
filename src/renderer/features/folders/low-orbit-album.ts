import type { SavedAlbum } from "../spotify/spotify-album"
import { coverUrl } from "../spotify/spotify-fixtures"

// The main process accepts only real Spotify ids, which the shared fixtures
// do not use, so the tests that add an album to a folder save this one.
export const lowOrbit: SavedAlbum = {
  album: {
    id: "2noRn2Aes5aoNVsU6iWThc",
    name: "Low Orbit",
    images: [{ url: coverUrl("low-orbit"), width: 640, height: 640 }],
    artists: [{ id: "0OdUWJ0sBjDrqHygGUXeCF", name: "Kite Theory" }],
    uri: "spotify:album:2noRn2Aes5aoNVsU6iWThc",
  },
}
