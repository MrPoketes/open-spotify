import path from "node:path"
import { Effect, Schedule, Schema } from "effect"
import { BrowserWindow } from "electron"
import appIconPath from "../../build/icons/256x256.png?asset"
import { rendererDevServerUrl } from "../shared/dev-server"
import { SystemBrowser } from "./auth/system-browser"
import { mainRuntime } from "./main-runtime"
import { decideNavigation } from "./navigation-decision"
import { rendererEntryUrl } from "./renderer-protocol"
import { loadSavedTheme } from "./saved-theme"

const rendererUrl = import.meta.env.DEV ? rendererDevServerUrl : rendererEntryUrl

class RendererLoadError extends Schema.TaggedError<RendererLoadError>()("RendererLoadError", {
  cause: Schema.Defect(),
}) {}

const openInSystemBrowser = Effect.fn("openInSystemBrowser")(
  function* (url: string) {
    const browser = yield* SystemBrowser
    yield* browser.open(url)
  },
  Effect.catch((error) => Effect.logError("Could not open link in system browser", error)),
)

export const createMainWindow = Effect.gen(function* () {
  const savedTheme = yield* loadSavedTheme
  const window = new BrowserWindow({
    // The page sets its colors only once its script has applied the theme, so
    // until then the window shows this color instead of a white flash.
    backgroundColor: savedTheme.tokens["color-canvas"],
    width: 1280,
    height: 800,
    // Without it, Linux and development builds show Electron's default icon.
    // macOS ignores it and uses the app bundle's icon.
    icon: appIconPath,
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
    if (decideNavigation(url, rendererUrl) === "browser") {
      mainRuntime.runFork(openInSystemBrowser(url))
    }
    return { action: "deny" }
  })
  window.webContents.on("will-navigate", (event) => {
    const decision = decideNavigation(event.url, rendererUrl)
    if (decision === "in-app") {
      return
    }
    event.preventDefault()
    if (decision === "browser") {
      mainRuntime.runFork(openInSystemBrowser(event.url))
    }
  })

  yield* loadRenderer(window)
  return window
})

// In development Electron can start before Vite is listening, so retry for a
// while instead of leaving a blank window.
function loadRenderer(window: BrowserWindow): Effect.Effect<void, RendererLoadError> {
  const load = Effect.tryPromise({
    try: () => window.loadURL(rendererUrl),
    catch: (cause) => new RendererLoadError({ cause }),
  })
  if (!import.meta.env.DEV) {
    return load
  }
  return load.pipe(Effect.retry({ schedule: Schedule.spaced("500 millis"), times: 60 }))
}
