import { BrowserWindow, app } from "electron"
import { type Cause, Effect, Exit } from "effect"
import { registerIpcHandlers } from "./ipc-handlers"
import { mainRuntime } from "./main-runtime"
import { createMainWindow } from "./main-window"
import { registerRendererScheme, serveRendererFiles } from "./renderer-protocol"

const start = Effect.gen(function* () {
  yield* Effect.promise(() => app.whenReady())
  serveRendererFiles()
  registerIpcHandlers()
  yield* createMainWindow
})

const exitAfterStartupFailure = (cause: Cause.Cause<unknown>) =>
  Effect.logError("Open Spotify failed to start", cause).pipe(
    Effect.andThen(Effect.sync(() => app.exit(1))),
  )

function showMainWindow(): void {
  const [mainWindow] = BrowserWindow.getAllWindows()
  if (mainWindow === undefined) {
    mainRuntime.runFork(createMainWindow)
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
  app.on("activate", showMainWindow)
  app.on("second-instance", showMainWindow)
  app.on("will-quit", () => {
    void mainRuntime.dispose()
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
