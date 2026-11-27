import { Effect, Record, Schema } from "effect"

// Hex only, so the contrast of any theme can be computed without a CSS color
// parser.
export const HexColor = Schema.String.check(
  Schema.isPattern(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, { expected: "a hex color like #1a2b3c" }),
)

// Turns the #rgb form of a hex color into #rrggbb, and returns #rrggbb as is.
export const sixDigitHexColor = (hexColor: string) =>
  hexColor.length === 4 ? hexColor.replaceAll(/[0-9a-f]/gi, "$&$&") : hexColor

export const CssLength = Schema.String.check(
  Schema.isPattern(/^(0|\d+(\.\d+)?(px|rem|em))$/, { expected: "a length like 8px or 0.5rem" }),
)

const CssValue = Schema.String.check(Schema.isNonEmpty({ expected: "a value" }))

const Opacity = Schema.String.check(
  Schema.isPattern(/^(0(\.\d+)?|1(\.0+)?)$/, { expected: "an opacity from 0 to 1, like 0.4" }),
)

// docs/themes.md describes each token. Each one becomes the CSS custom
// property `--theme-<token>`.
export const themeTokenSchemas = {
  "color-canvas": HexColor,
  "color-surface": HexColor,
  "color-surface-raised": HexColor,
  "color-surface-overlay": HexColor,
  "color-border": HexColor,
  "color-foreground": HexColor,
  "color-muted": HexColor,
  "color-accent": HexColor,
  "color-on-accent": HexColor,
  "color-focus": HexColor,
  "color-danger": HexColor,
  "font-body": CssValue,
  "font-display": CssValue,
  "radius-small": CssLength,
  "radius-medium": CssLength,
  "radius-large": CssLength,
  spacing: CssLength,
  "shadow-raised": CssValue,
  "shadow-overlay": CssValue,
  "artwork-wash": Opacity,
}

export type ThemeToken = keyof typeof themeTokenSchemas

// Schibsted Grotesk ships with the app (src/renderer/styles/app.css), so the
// default look is the same on every platform. The system fonts behind it cover
// the scripts it lacks.
const defaultFontStack =
  '"Schibsted Grotesk Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

// The default dark theme's values.
export const defaultThemeTokens: Record<ThemeToken, string> = {
  "color-canvas": "#0b0a09",
  "color-surface": "#161412",
  "color-surface-raised": "#221f1b",
  "color-surface-overlay": "#2b2722",
  "color-border": "#38322c",
  "color-foreground": "#f3eee7",
  "color-muted": "#aaa196",
  "color-accent": "#ff8f66",
  "color-on-accent": "#24100a",
  "color-focus": "#8db3ff",
  "color-danger": "#ff7a88",
  "font-body": defaultFontStack,
  "font-display": defaultFontStack,
  "radius-small": "6px",
  "radius-medium": "10px",
  "radius-large": "16px",
  spacing: "0.25rem",
  "shadow-raised": "0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.35)",
  "shadow-overlay": "0 2px 6px rgb(0 0 0 / 0.4), 0 20px 48px rgb(0 0 0 / 0.55)",
  "artwork-wash": "0.45",
}

// A theme written before a token existed keeps working: the token takes the
// default theme's value.
const ThemeTokens = Schema.Struct(
  Record.map(themeTokenSchemas, (valueSchema, token) =>
    valueSchema.pipe(Schema.withDecodingDefaultKey(Effect.succeed(defaultThemeTokens[token]))),
  ),
)

// Whether a theme is dark or light sets CSS `color-scheme`, so native
// scrollbars and form controls match it.
export const Theme = Schema.Struct({
  name: Schema.NonEmptyString,
  author: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  colorScheme: Schema.Literals(["dark", "light"]),
  tokens: ThemeTokens,
})

export type Theme = typeof Theme.Type

// Indented, because people read and edit theme files by hand.
export const ThemeFile = Schema.fromJsonString(Theme, { space: 2 })

// Unknown keys are rejected rather than dropped, so a misspelled token is
// reported instead of silently changing nothing.
export const decodeThemeFile = Schema.decodeUnknownEffect(ThemeFile, { onExcessProperty: "error" })
