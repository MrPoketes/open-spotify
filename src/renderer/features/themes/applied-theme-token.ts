import type { ThemeToken } from "../../../shared/theme"

export const appliedToken = (token: ThemeToken) =>
  document.documentElement.style.getPropertyValue(`--theme-${token}`)
