import { Schema } from "effect"

export const minimumSidebarWidth = 200
export const maximumSidebarWidth = 420
export const defaultSidebarWidth = 280

export const SidebarWidth = Schema.Int.check(
  Schema.isBetween({ minimum: minimumSidebarWidth, maximum: maximumSidebarWidth }),
)
