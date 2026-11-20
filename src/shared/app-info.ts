import { Schema } from "effect"

export const AppInfo = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  platform: Schema.String,
})

export type AppInfo = typeof AppInfo.Type
