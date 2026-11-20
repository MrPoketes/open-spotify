// Names of the messages the renderer can send to the main process.
// Both sides import from here so a renamed channel fails to compile
// instead of failing silently at runtime.
export const ipcChannels = {
  getAppInfo: "app:get-info",
  getSetting: "settings:get",
  setSetting: "settings:set",
  getEnvironmentClientId: "settings:get-environment-client-id",
  logIn: "auth:log-in",
  cancelLogIn: "auth:cancel-log-in",
  getAccessToken: "auth:get-access-token",
  logOut: "auth:log-out",
  getFolderTree: "folders:get-tree",
  createFolder: "folders:create",
  renameFolder: "folders:rename",
  deleteFolder: "folders:delete",
  addFolderItem: "folders:add-item",
  removeFolderItem: "folders:remove-item",
  moveFolder: "folders:move-folder",
  moveFolderItem: "folders:move-item",
} as const

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels]
