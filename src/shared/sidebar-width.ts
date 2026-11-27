import { Schema } from "effect"

export const minimumSidebarWidth = 200
export const maximumSidebarWidth = 420
export const defaultSidebarWidth = 280
// The icon rail: 40 px artwork with 16 px either side.
export const collapsedSidebarWidth = 72

export const SidebarWidth = Schema.Int.check(
  Schema.isBetween({ minimum: minimumSidebarWidth, maximum: maximumSidebarWidth }),
)
