import { describe, expect, it } from "vitest"
import { defaultThemeTokens } from "./theme"
import { findContrastShortfalls } from "./theme-contrast"

describe("findContrastShortfalls", () => {
  // Theme files may write colors in the short form, which must not hide a
  // low-contrast pair.
  it("reads a #rgb color like its #rrggbb form", () => {
    const shortForm = findContrastShortfalls({ ...defaultThemeTokens, "color-muted": "#333" })
    const longForm = findContrastShortfalls({ ...defaultThemeTokens, "color-muted": "#333333" })

    expect(shortForm).toEqual(longForm)
    expect(shortForm).not.toEqual([])
  })

  // WebAIM's checker gives #777777 on white a ratio of 4.48:1, just under the target.
  it("reports a pair that falls short with its ratio and target", () => {
    const shortfalls = findContrastShortfalls({
      ...defaultThemeTokens,
      "color-on-accent": "#777777",
      "color-accent": "#ffffff",
    })

    const [shortfall, ...otherShortfalls] = shortfalls
    expect(otherShortfalls).toEqual([])
    expect(shortfall).toMatchObject({
      foreground: "color-on-accent",
      background: "color-accent",
      target: 4.5,
    })
    expect(shortfall?.ratio).toBeCloseTo(4.48, 2)
  })
})
