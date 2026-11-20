import type { Theme } from "../../../shared/theme"

export const themeCustomProperties = (theme: Theme): Record<string, string> =>
  Object.fromEntries(
    Object.entries(theme.tokens).map(([token, value]) => [`--theme-${token}`, value]),
  )

// Components never read these values: app.css maps each property into a
// Tailwind class, so setting them restyles the whole app without a reload.
export function applyTheme(theme: Theme): void {
  const rootStyle = document.documentElement.style
  rootStyle.colorScheme = theme.colorScheme
  for (const [property, value] of Object.entries(themeCustomProperties(theme))) {
    rootStyle.setProperty(property, value)
  }
}
