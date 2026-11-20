import path from "node:path"
import { BrowserWindow, shell } from "electron"
import { Effect, Schedule, Schema } from "effect"
import { rendererDevServerUrl } from "../shared/dev-server"
import { rendererEntryUrl } from "./renderer-protocol"

class RendererLoadError extends Schema.TaggedError<RendererLoadError>()("RendererLoadError", {
  cause: Schema.Defect(),
}) {}

export const createMainWindow = Effect.gen(function* () {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  window.once("ready-to-show", () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    openInBrowser(url)
    return { action: "deny" }
  })

  yield* loadRenderer(window)
  return window
})

// In development Electron can start before Vite is listening, so retry for a
// while instead of leaving a blank window.
function loadRenderer(window: BrowserWindow): Effect.Effect<void, RendererLoadError> {
  if (!import.meta.env.DEV) {
    return loadUrl(window, rendererEntryUrl)
  }
  return loadUrl(window, rendererDevServerUrl).pipe(
    Effect.retry({ schedule: Schedule.spaced("500 millis"), times: 60 }),
  )
}

function loadUrl(window: BrowserWindow, url: string): Effect.Effect<void, RendererLoadError> {
  return Effect.tryPromise({
    try: () => window.loadURL(url),
    catch: (cause) => new RendererLoadError({ cause }),
  })
}

// Links that try to open a new window go to the user's browser instead.
// Only https is allowed so a page cannot launch arbitrary protocol handlers.
function openInBrowser(url: string): void {
  if (new URL(url).protocol === "https:") {
    void shell.openExternal(url)
  }
}
