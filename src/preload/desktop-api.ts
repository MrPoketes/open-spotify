import type { IpcChannel } from "../shared/ipc-channels"

// The only surface the renderer has into the main process. It is exposed as
// `window.desktop` and deliberately takes and returns `unknown`: each side
// decodes what it receives with a Schema, so a mismatch is caught at the
// boundary.
export interface DesktopApi {
  readonly invoke: (channel: IpcChannel, request?: unknown) => Promise<unknown>
}
