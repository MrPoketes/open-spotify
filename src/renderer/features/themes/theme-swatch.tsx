import type { Theme } from "../../../shared/theme"
import { themeCustomProperties } from "./apply-theme"

// The swatch sets the theme's properties on itself, and app.css resolves
// token classes on the element that uses them, so the classes inside draw
// this theme instead of the one applied to the app.
export function ThemeSwatch({ theme }: { readonly theme: Theme }) {
  return (
    <div
      aria-hidden
      style={themeCustomProperties(theme)}
      className="flex h-10 w-16 shrink-0 flex-col justify-between rounded-small bg-surface p-2 text-foreground ring-1 ring-border"
    >
      <span className="font-display text-xs leading-none font-bold">Aa</span>
      <span className="h-1 w-6 rounded-full bg-accent" />
    </div>
  )
}
