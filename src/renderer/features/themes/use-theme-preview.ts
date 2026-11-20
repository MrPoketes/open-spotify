import { useEffect, useState } from "react"
import { type ThemeId, builtInThemes } from "../../../shared/built-in-themes"
import { applyTheme } from "./apply-theme"

// A hovered theme wins over a focused one, so the pointer can preview themes
// while keyboard focus stays put. When neither is set, or the picker unmounts
// (a history shortcut can leave the page mid-preview), the saved theme returns.
export function useThemePreview(savedThemeId: ThemeId) {
  const [hoveredThemeId, setHoveredThemeId] = useState<ThemeId | null>(null)
  const [focusedThemeId, setFocusedThemeId] = useState<ThemeId | null>(null)
  const previewedThemeId = hoveredThemeId ?? focusedThemeId

  useEffect(() => {
    applyTheme(builtInThemes[previewedThemeId ?? savedThemeId])
    return () => applyTheme(builtInThemes[savedThemeId])
  }, [previewedThemeId, savedThemeId])

  return { setHoveredThemeId, setFocusedThemeId }
}
