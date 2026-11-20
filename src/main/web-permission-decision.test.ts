import { assert, describe, it } from "@effect/vitest"
import { isWebPermissionGranted } from "./web-permission-decision"

describe("isWebPermissionGranted", () => {
  // Onboarding's copy button writes the redirect URI with
  // `navigator.clipboard.writeText`, which fails when this is denied.
  it("grants writing to the clipboard", () => {
    assert.isTrue(isWebPermissionGranted("clipboard-sanitized-write"))
  })

  it.each([
    "clipboard-read",
    "media",
    "notifications",
    "geolocation",
    "openExternal",
    "fullscreen",
  ] as const)("denies %s", (permission) => {
    assert.isFalse(isWebPermissionGranted(permission))
  })
})
