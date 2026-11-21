import { sixDigitHexColor, type Theme, type ThemeToken } from "./theme"

// The linear value of one channel of a #rrggbb color, as WCAG 2.2 defines it.
const linearChannel = (hexColor: string, offset: number) => {
  const channel = Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255
  return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (hexColor: string) => {
  const longHexColor = sixDigitHexColor(hexColor)
  return (
    0.2126 * linearChannel(longHexColor, 1) +
    0.7152 * linearChannel(longHexColor, 3) +
    0.0722 * linearChannel(longHexColor, 5)
  )
}

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

const textColors = ["color-foreground", "color-muted", "color-accent", "color-danger"] as const

interface ContrastPair {
  readonly foreground: ThemeToken
  readonly background: ThemeToken
  readonly target: number
}

// The WCAG 2.2 AA targets from the Accessibility section of docs/design.md.
const contrastPairs: ReadonlyArray<ContrastPair> = [
  ...textColors.flatMap((foreground) =>
    surfaces.map((background) => ({ foreground, background, target: 4.5 })),
  ),
  { foreground: "color-on-accent", background: "color-accent", target: 4.5 },
  ...surfaces.map((background) => ({ foreground: "color-focus" as const, background, target: 3 })),
]

export interface ContrastShortfall extends ContrastPair {
  readonly ratio: number
}

export const findContrastShortfalls = (tokens: Theme["tokens"]): ReadonlyArray<ContrastShortfall> =>
  contrastPairs
    .map((pair) => ({
      ...pair,
      ratio: contrastRatio(tokens[pair.foreground], tokens[pair.background]),
    }))
    .filter((shortfall) => shortfall.ratio < shortfall.target)
