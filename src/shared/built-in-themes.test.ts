import { describe, expect, it } from "vitest"
import { builtInThemes } from "./built-in-themes"

// The linear value of one channel of a #rrggbb color, as WCAG 2.2 defines it.
const linearChannel = (hexColor: string, offset: number) => {
  const channel = Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255
  return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (hexColor: string) =>
  0.2126 * linearChannel(hexColor, 1) +
  0.7152 * linearChannel(hexColor, 3) +
  0.0722 * linearChannel(hexColor, 5)

const contrastRatio = (firstColor: string, secondColor: string) => {
  const firstLuminance = relativeLuminance(firstColor)
  const secondLuminance = relativeLuminance(secondColor)
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  )
}

const surfaces = [
  "color-canvas",
  "color-surface",
  "color-surface-raised",
  "color-surface-overlay",
] as const

// The targets come from the Accessibility section of docs/design.md.
describe.each(Object.entries(builtInThemes))("the built-in %s theme", (_themeId, theme) => {
  it.each(["color-foreground", "color-muted", "color-accent", "color-danger"] as const)(
    "gives %s text at least 4.5:1 contrast on every surface",
    (textColor) => {
      for (const surface of surfaces) {
        expect(contrastRatio(theme.tokens[textColor], theme.tokens[surface])).toBeGreaterThan(4.5)
      }
    },
  )

  it("gives the focus ring at least 3:1 contrast on every surface", () => {
    for (const surface of surfaces) {
      expect(contrastRatio(theme.tokens["color-focus"], theme.tokens[surface])).toBeGreaterThan(3)
    }
  })

  it("gives text on the accent color at least 4.5:1 contrast", () => {
    expect(
      contrastRatio(theme.tokens["color-on-accent"], theme.tokens["color-accent"]),
    ).toBeGreaterThan(4.5)
  })
})
