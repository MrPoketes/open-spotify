import type { Theme } from "../../../shared/theme"
import { themeCustomProperties } from "./apply-theme"

// The swatch sets the theme's properties on itself, and app.css resolves
// token classes on the element that uses them, so the classes inside draw
// this theme instead of the one applied to the app. Spacing is left out so
// every swatch in the list is the same size.
const swatchProperties = (theme: Theme) =>
  Object.fromEntries(
    Object.entries(themeCustomProperties(theme)).filter(
      ([property]) => property !== "--theme-spacing",
    ),
  )

// A miniature of the app in the theme: a strip of canvas where the sidebar
// sits, and the raised sheet with a heading and the accent on it.
export function ThemeSwatch({ theme }: { readonly theme: Theme }) {
  return (
    <div
      aria-hidden
      style={swatchProperties(theme)}
      className="flex h-10 w-16 shrink-0 rounded-small bg-canvas py-1 pr-1 pl-3 ring-1 ring-border"
    >
      <div className="flex flex-1 flex-col justify-between rounded-small bg-surface p-1.5 text-foreground shadow-raised">
        <span className="font-display text-xs leading-none font-bold">Aa</span>
        <span className="h-1 w-5 rounded-full bg-accent" />
      </div>
    </div>
  )
}
