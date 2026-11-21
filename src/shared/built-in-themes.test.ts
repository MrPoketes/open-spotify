import { describe, expect, it } from "vitest"
import { builtInThemes } from "./built-in-themes"
import { findContrastShortfalls } from "./theme-contrast"

describe.each(Object.entries(builtInThemes))("the built-in %s theme", (_themeId, theme) => {
  it("meets every contrast target", () => {
    expect(findContrastShortfalls(theme.tokens)).toEqual([])
  })
})
