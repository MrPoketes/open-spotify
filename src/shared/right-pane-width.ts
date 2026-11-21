import { Schema } from "effect"

export const minimumRightPaneWidth = 280
export const maximumRightPaneWidth = 400
export const defaultRightPaneWidth = 320

export const RightPaneWidth = Schema.Int.check(
  Schema.isBetween({ minimum: minimumRightPaneWidth, maximum: maximumRightPaneWidth }),
)
