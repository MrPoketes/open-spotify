import type { IpcChannel } from "../shared/ipc-channels"

// The only surface the renderer has into the main process. It is exposed as
// `window.desktop` and deliberately returns `unknown`: the renderer decodes
// every reply with a Schema, so a mismatch is caught at the boundary.
export interface DesktopApi {
  readonly invoke: (channel: IpcChannel) => Promise<unknown>
}
