import type { DesktopApi } from "../../preload/desktop-api"
import type { IpcChannel } from "../../shared/ipc-channels"

// Wraps a fake main process so the given channel rejects, the way a real
// handler does when its file or database operation fails. Every other channel
// still answers.
export const mainProcessFailingOn = (
  failingChannel: IpcChannel,
  mainProcess: DesktopApi,
): DesktopApi => ({
  invoke: (channel, request) =>
    channel === failingChannel
      ? Promise.reject(new Error(`The main process could not handle ${channel}`))
      : mainProcess.invoke(channel, request),
})
