import { Effect, Record, Schema } from "effect"

// Hex only, so the contrast of any theme can be computed without a CSS color
// parser.
export const HexColor = Schema.String.check(
  Schema.isPattern(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, { expected: "a hex color like #1a2b3c" }),
)

export const CssLength = Schema.String.check(
  Schema.isPattern(/^(0|\d+(\.\d+)?(px|rem|em))$/, { expected: "a length like 8px or 0.5rem" }),
)

const CssValue = Schema.String.check(Schema.isNonEmpty({ expected: "a value" }))

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
}

export type ThemeToken = keyof typeof themeTokenSchemas

const systemFontStack =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

// The default dark theme's values.
export const defaultThemeTokens: Record<ThemeToken, string> = {
  "color-canvas": "#0c0e13",
  "color-surface": "#14171f",
  "color-surface-raised": "#1d212c",
  "color-surface-overlay": "#252a37",
  "color-border": "#343a4a",
  "color-foreground": "#eceef4",
  "color-muted": "#9ba2b4",
  "color-accent": "#ff8f66",
  "color-on-accent": "#24100a",
  "color-focus": "#8db3ff",
  "color-danger": "#ff7081",
  "font-body": systemFontStack,
  "font-display": systemFontStack,
  "radius-small": "4px",
  "radius-medium": "8px",
  "radius-large": "14px",
  spacing: "0.25rem",
  "shadow-raised": "0 2px 8px rgb(0 0 0 / 0.35)",
  "shadow-overlay": "0 12px 32px rgb(0 0 0 / 0.5)",
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
