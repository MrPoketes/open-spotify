import { Layer } from "effect"
import type { SpotifyItem } from "../shared/folders"
import { databaseLayer } from "./database"
import { Folders } from "./folders"

// Each call opens its own in-memory database, so tests never share folders.
// The database stays accessible so a test can inspect its rows.
export const freshFolders = () => Folders.layer.pipe(Layer.provideMerge(databaseLayer(":memory:")))

export const album: SpotifyItem = {
  _tag: "SpotifyItem",
  uri: "spotify:album:4aawyAB9vmqN3uQ7FjRGTy",
  name: "Global Warming",
  imageUrl: "https://i.scdn.co/image/global-warming",
}

export const playlist: SpotifyItem = {
  _tag: "SpotifyItem",
  uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
  name: "Today's Top Hits",
  imageUrl: null,
}

export const artist: SpotifyItem = {
  _tag: "SpotifyItem",
  uri: "spotify:artist:0OdUWJ0sBjDrqHygGUXeCF",
  name: "Band of Horses",
  imageUrl: null,
}
