import { Layer } from "effect"
import type { SpotifyApi } from "../spotify/spotify-api"
import { Player } from "./player"

// The Player over a fake Spotify layer, for tests of the Player itself.
export const playerOver = (spotify: Layer.Layer<SpotifyApi>) =>
  Player.layer.pipe(Layer.provide(spotify))
