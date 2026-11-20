import { BrowserWindow, app } from "electron"
import { Effect } from "effect"
import { registerIpcHandlers } from "./ipc-handlers"
import { mainRuntime } from "./main-runtime"
import { createMainWindow } from "./main-window"
import { registerRendererScheme, serveRendererFiles } from "./renderer-protocol"

registerRendererScheme()

const start = Effect.gen(function* () {
  yield* Effect.promise(() => app.whenReady())
  serveRendererFiles()
  registerIpcHandlers()
  yield* createMainWindow
}).pipe(
  Effect.catchCause((cause) =>
    Effect.logError("Open Spotify failed to start", cause).pipe(
      Effect.andThen(Effect.sync(() => app.exit(1))),
    ),
  ),
)

// macOS apps stay running with no windows open until the user quits.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainRuntime.runFork(createMainWindow)
  }
})

app.on("will-quit", () => {
  void mainRuntime.dispose()
})

mainRuntime.runFork(start)
