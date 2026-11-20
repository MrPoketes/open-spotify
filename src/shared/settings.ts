import { Schema } from "effect"
import { FolderView } from "./folder-view"
import { SidebarWidth } from "./sidebar-width"
import { ThemeId } from "./theme-library"
import { TrackListDensity } from "./track-list-density"

export const SettingKey = Schema.Literals([
  "spotifyClientId",
  "themeId",
  "sidebarWidth",
  "folderView",
  "trackListDensity",
])

export type SettingKey = typeof SettingKey.Type

// Each setting's value is validated with its own Schema, both when the
// renderer sends it and when it is read back from the database.
export const settingSchemas = {
  spotifyClientId: Schema.NonEmptyString,
  themeId: ThemeId,
  sidebarWidth: SidebarWidth,
  folderView: FolderView,
  trackListDensity: TrackListDensity,
} satisfies Record<SettingKey, Schema.Top>

export type SettingValue<K extends SettingKey> = (typeof settingSchemas)[K]["Type"]

export const GetSettingRequest = Schema.Struct({ key: SettingKey })

// The value is decoded in a second step, with the Schema of the given key.
export const SetSettingRequest = Schema.Struct({ key: SettingKey, value: Schema.Unknown })

// IPC messages are structured-cloned, which cannot carry an Option, so a
// missing setting travels as null.
export const SettingReply = <K extends SettingKey>(key: K) =>
  Schema.OptionFromNullOr(settingSchemas[key])
