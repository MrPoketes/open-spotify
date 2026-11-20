import { Schema } from "effect"
import { type Theme, defaultThemeTokens } from "./theme"

export const ThemeId = Schema.Literals(["dark", "light"])

export type ThemeId = typeof ThemeId.Type

export const themeIds = ThemeId.literals

export const defaultThemeId: ThemeId = "dark"

export const builtInThemes: Record<ThemeId, Theme> = {
  dark: {
    name: "Open Spotify Dark",
    author: "Open Spotify",
    version: "1.0.0",
    colorScheme: "dark",
    tokens: defaultThemeTokens,
  },
  light: {
    name: "Open Spotify Light",
    author: "Open Spotify",
    version: "1.0.0",
    colorScheme: "light",
    tokens: {
      ...defaultThemeTokens,
      "color-canvas": "#e4e7ee",
      "color-surface": "#f6f7fa",
      "color-surface-raised": "#ffffff",
      "color-surface-overlay": "#ffffff",
      "color-border": "#c9cdd8",
      "color-foreground": "#161922",
      "color-muted": "#525a6b",
      "color-accent": "#b23f1b",
      "color-on-accent": "#ffffff",
      "color-focus": "#2b5bcc",
      "color-danger": "#b11d38",
      "shadow-raised": "0 2px 8px rgb(22 25 34 / 0.12)",
      "shadow-overlay": "0 12px 32px rgb(22 25 34 / 0.2)",
    },
  },
}
