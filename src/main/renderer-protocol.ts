import path from "node:path"
import { pathToFileURL } from "node:url"
import { app, net, protocol } from "electron"
import { mainRuntime } from "./main-runtime"
import { resolveRendererFile } from "./renderer-files"

// Production builds load the UI from `app://renderer/` instead of `file://`.
// A standard, secure scheme gives the page a real origin, so browser history
// routing, `fetch` and the content security policy behave as on the web.
const scheme = "app"

export const rendererEntryUrl = `${scheme}://renderer/`

// Privileges can only be granted before the app is ready.
export function registerRendererScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ])
}

export function serveRendererFiles(): void {
  const rendererDir = path.join(app.getAppPath(), "dist", "client")

  protocol.handle(scheme, async (request) => {
    const filePath = await mainRuntime.runPromise(resolveRendererFile(rendererDir, request.url))
    return net.fetch(pathToFileURL(filePath).href)
  })
}
