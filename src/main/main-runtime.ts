import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { Layer, ManagedRuntime, type Effect, type Fiber } from "effect"
import { app, dialog, safeStorage, shell } from "electron"
import { SpotifySession } from "./auth/spotify-session"
import { SpotifyTokenEndpoint } from "./auth/spotify-token-endpoint"
import { SystemBrowser } from "./auth/system-browser"
import { TokenStore } from "./auth/token-store"
import { databaseLayer } from "./database"
import { Folders } from "./folders"
import { FoldersFileDialogs } from "./folders-file-dialogs"
import { ImportedThemes } from "./imported-themes"
import { Settings } from "./settings"
import { ThemeFileDialogs } from "./theme-file-dialogs"

const databaseFile = path.join(app.getPath("userData"), "open-spotify.sqlite")
const spotifySessionFile = path.join(app.getPath("userData"), "spotify-session.bin")

const storageLayer = Layer.mergeAll(Settings.layer, Folders.layer, ImportedThemes.layer).pipe(
  Layer.provide(databaseLayer(databaseFile)),
)

const systemBrowserLayer = SystemBrowser.layer((url) => shell.openExternal(url))

const spotifySessionLayer = SpotifySession.layer.pipe(
  Layer.provide([
    storageLayer,
    SpotifyTokenEndpoint.layer,
    TokenStore.layer(safeStorage, spotifySessionFile),
    systemBrowserLayer,
  ]),
)

const mainLayer = Layer.mergeAll(
  storageLayer,
  spotifySessionLayer,
  systemBrowserLayer,
  ThemeFileDialogs.layer(dialog),
  FoldersFileDialogs.layer(dialog),
).pipe(Layer.provideMerge(NodeFileSystem.layer))

type MainServices = Layer.Success<typeof mainLayer>
type MainLayerError = Layer.Error<typeof mainLayer>

// Forked fibers have no caller to receive a failure, so every typed error must
// be handled before runFork.
type MainRuntime = Omit<ManagedRuntime.ManagedRuntime<MainServices, MainLayerError>, "runFork"> & {
  readonly runFork: <A>(
    self: Effect.Effect<A, never, MainServices>,
    options?: Effect.RunOptions,
  ) => Fiber.Fiber<A, MainLayerError>
}

// Runs Effect programs from Electron callbacks. Every service the main
// process depends on is provided here, in one place.
export const mainRuntime: MainRuntime = ManagedRuntime.make(mainLayer)
