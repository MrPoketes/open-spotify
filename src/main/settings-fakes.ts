import { Layer } from "effect"
import { databaseLayer } from "./database"
import { Settings } from "./settings"

// Each call opens its own in-memory database, so tests never share settings.
// The database stays accessible so a test can inspect its rows.
export const freshSettings = () =>
  Settings.layer.pipe(Layer.provideMerge(databaseLayer(":memory:")))
