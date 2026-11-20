import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { app } from "electron"
import { Layer, ManagedRuntime } from "effect"
import { databaseLayer } from "./database"
import { Settings } from "./settings"

const databaseFile = path.join(app.getPath("userData"), "open-spotify.sqlite")

// Runs Effect programs from Electron callbacks. Every service the main
// process depends on is provided here, in one place.
export const mainRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    NodeFileSystem.layer,
    Settings.layer.pipe(Layer.provide(databaseLayer(databaseFile))),
  ),
)
