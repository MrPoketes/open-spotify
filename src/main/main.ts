import { BrowserWindow, app, session } from "electron"
import { type Cause, Effect, Exit } from "effect"
import { registerIpcHandlers } from "./ipc-handlers"
import { mainRuntime } from "./main-runtime"
import { createMainWindow } from "./main-window"
import { openWindowIfNone } from "./open-window-if-none"
import { registerRendererScheme, serveRendererFiles } from "./renderer-protocol"
import { isWebPermissionGranted } from "./web-permission-decision"

const openMainWindow = openWindowIfNone(
  createMainWindow,
  () => BrowserWindow.getAllWindows().length,
)

function restrictWebPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, grant) =>
    grant(isWebPermissionGranted(permission)),
  )
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
    isWebPermissionGranted(permission),
  )
}

const start = Effect.gen(function* () {
  // oxlint-disable-next-line open-spotify/no-effect-promise -- Electron's app.whenReady() resolves on the ready event and never rejects.
  yield* Effect.promise(() => app.whenReady())
  restrictWebPermissions()
  serveRendererFiles()
  registerIpcHandlers()
  yield* createMainWindow
  // Electron emits `activate` at launch too, possibly before the window above
  // exists, so the Dock icon reopens a window only once startup has opened one.
  app.on("activate", () => {
    mainRuntime.runFork(openMainWindow)
  })
})

const exitAfterStartupFailure = (cause: Cause.Cause<unknown>) =>
  Effect.logError("Open Spotify failed to start", cause).pipe(
    Effect.andThen(Effect.sync(() => app.exit(1))),
  )

// Only focuses: during startup the window does not exist yet and `start`
// is about to create it, so creating one here would open a second window.
function focusMainWindow(): void {
  const [mainWindow] = BrowserWindow.getAllWindows()
  if (mainWindow === undefined) {
    return
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.focus()
}

function startPrimaryInstance(): void {
  registerRendererScheme()

  // macOS apps stay running with no windows open until the user quits.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })
  app.on("second-instance", focusMainWindow)
  app.on("will-quit", () => {
    Effect.runFork(mainRuntime.disposeEffect)
  })

  // The runtime builds its layers, including opening and migrating the
  // database, before it runs `start`. Those failures appear only in the exit,
  // never inside `start`, so they are handled here.
  mainRuntime.runCallback(start, {
    onExit: (exit) => {
      if (Exit.isFailure(exit)) {
        Effect.runFork(exitAfterStartupFailure(exit.cause))
      }
    },
  })
}

// A second copy would open the same database and login, so launching the app
// again hands over to the running copy, which brings its window forward. The
// check comes first so a second copy quits before it touches `mainRuntime`.
if (app.requestSingleInstanceLock()) {
  startPrimaryInstance()
} else {
  app.quit()
}
