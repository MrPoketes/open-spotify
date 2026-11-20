import path from "node:path"
import { BrowserWindow, shell } from "electron"
import { Effect, Schedule } from "effect"
import { rendererDevServerUrl } from "../shared/dev-server"
import { rendererEntryUrl } from "./renderer-protocol"

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
function loadRenderer(window: BrowserWindow): Effect.Effect<void, unknown> {
  if (!import.meta.env.DEV) {
    return Effect.tryPromise(() => window.loadURL(rendererEntryUrl))
  }
  return Effect.tryPromise(() => window.loadURL(rendererDevServerUrl)).pipe(
    Effect.retry({ schedule: Schedule.spaced("500 millis"), times: 60 }),
  )
}

// Links that try to open a new window go to the user's browser instead.
// Only https is allowed so a page cannot launch arbitrary protocol handlers.
function openInBrowser(url: string): void {
  if (new URL(url).protocol === "https:") {
    void shell.openExternal(url)
  }
}
