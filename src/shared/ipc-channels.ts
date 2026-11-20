// Names of the messages the renderer can send to the main process.
// Both sides import from here so a renamed channel fails to compile
// instead of failing silently at runtime.
export const ipcChannels = {
  getAppInfo: "app:get-info",
  getSetting: "settings:get",
  setSetting: "settings:set",
} as const

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels]
