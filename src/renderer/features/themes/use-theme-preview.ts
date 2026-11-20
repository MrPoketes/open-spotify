import { useEffect, useState } from "react"
import type { Theme } from "../../../shared/theme"
import { applyTheme } from "./apply-theme"

// A hovered theme wins over a focused one, so the pointer can preview themes
// while keyboard focus stays put. When neither is set, or the picker unmounts
// (a history shortcut can leave the page mid-preview), the saved theme returns.
export function useThemePreview(savedTheme: Theme) {
  const [hoveredTheme, setHoveredTheme] = useState<Theme | null>(null)
  const [focusedTheme, setFocusedTheme] = useState<Theme | null>(null)
  const previewedTheme = hoveredTheme ?? focusedTheme

  useEffect(() => {
    applyTheme(previewedTheme ?? savedTheme)
    return () => applyTheme(savedTheme)
  }, [previewedTheme, savedTheme])

  return { setHoveredTheme, setFocusedTheme }
}
