import type { Theme } from "../../../shared/theme"

// Components never read these values: app.css maps each property into a
// Tailwind class, so setting them restyles the whole app without a reload.
export function applyTheme(theme: Theme): void {
  const rootStyle = document.documentElement.style
  rootStyle.colorScheme = theme.colorScheme
  for (const [token, value] of Object.entries(theme.tokens)) {
    rootStyle.setProperty(`--theme-${token}`, value)
  }
}
