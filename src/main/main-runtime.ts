import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { app, dialog, safeStorage, shell } from "electron"
import { Layer, ManagedRuntime } from "effect"
import { SpotifySession } from "./auth/spotify-session"
import { SpotifyTokenEndpoint } from "./auth/spotify-token-endpoint"
import { SystemBrowser } from "./auth/system-browser"
import { TokenStore } from "./auth/token-store"
import { databaseLayer } from "./database"
import { FileDialogs } from "./file-dialogs"
import { Folders } from "./folders"
import { Settings } from "./settings"

const databaseFile = path.join(app.getPath("userData"), "open-spotify.sqlite")
const spotifySessionFile = path.join(app.getPath("userData"), "spotify-session.bin")

const storageLayer = Layer.mergeAll(Settings.layer, Folders.layer).pipe(
  Layer.provide(databaseLayer(databaseFile)),
)

const spotifySessionLayer = SpotifySession.layer.pipe(
  Layer.provide([
    storageLayer,
    SpotifyTokenEndpoint.layer,
    TokenStore.layer(safeStorage, spotifySessionFile),
    SystemBrowser.layer((url) => shell.openExternal(url)),
  ]),
)

// Runs Effect programs from Electron callbacks. Every service the main
// process depends on is provided here, in one place.
export const mainRuntime = ManagedRuntime.make(
  Layer.mergeAll(storageLayer, spotifySessionLayer, FileDialogs.layer(dialog)).pipe(
    Layer.provideMerge(NodeFileSystem.layer),
  ),
)
