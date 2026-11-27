import { defaultThemeTokens, type Theme } from "./theme"

export const defaultThemeId = "dark"

export const builtInThemes = {
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
      "color-canvas": "#e8e3dc",
      "color-surface": "#faf8f5",
      "color-surface-raised": "#f0ebe5",
      "color-surface-overlay": "#ffffff",
      "color-border": "#d8d1c8",
      "color-foreground": "#1c1a17",
      "color-muted": "#5e564d",
      "color-accent": "#b23f1b",
      "color-on-accent": "#ffffff",
      "color-focus": "#2b5bcc",
      "color-danger": "#b11d38",
      "shadow-raised": "0 1px 2px rgb(28 26 23 / 0.08), 0 8px 24px rgb(28 26 23 / 0.1)",
      "shadow-overlay": "0 2px 6px rgb(28 26 23 / 0.1), 0 20px 48px rgb(28 26 23 / 0.2)",
      "artwork-wash": "0.3",
    },
  },
} satisfies Record<string, Theme>
