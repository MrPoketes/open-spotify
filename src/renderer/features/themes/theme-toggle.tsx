import { use, useState } from "react"
import type { ThemeId } from "../../../shared/built-in-themes"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { selectTheme } from "./saved-theme"

// A stand-in for the theme picker (M6) so switching can be tried in the app.
export function ThemeToggle({ savedThemeId }: { readonly savedThemeId: ThemeId }) {
  const runtime = use(RendererRuntimeContext)
  const [themeId, setThemeId] = useState(savedThemeId)
  const otherThemeId = themeId === "dark" ? "light" : "dark"

  const switchTheme = () => {
    setThemeId(otherThemeId)
    runtime.runFork(selectTheme(otherThemeId))
  }

  return (
    <button
      type="button"
      onClick={switchTheme}
      className="rounded-small bg-surface-raised px-3 py-2 text-sm"
    >
      Use {otherThemeId} theme
    </button>
  )
}
