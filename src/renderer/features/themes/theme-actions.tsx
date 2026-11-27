import type { ReactNode } from "react"
import type { LibraryTheme } from "../../../shared/theme-library"
import { Button } from "../../ui/button"
import { useThemeFiles } from "./use-theme-files"

interface ThemeActionsProps {
  // Comes first in the row, ahead of import and export.
  readonly children: ReactNode
  readonly onImport: (importedTheme: LibraryTheme) => void
}

// The row of buttons under the theme picker, and what importing or exporting
// a file reported.
export function ThemeActions({ children, onImport }: ThemeActionsProps) {
  const { message, importThemeFile, exportCurrentTheme } = useThemeFiles(onImport)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {children}
        <Button variant="secondary" onClick={importThemeFile}>
          Import theme…
        </Button>
        <Button variant="secondary" onClick={exportCurrentTheme}>
          Export current theme…
        </Button>
      </div>
      {/* Stays on the page so screen readers announce each new status. */}
      <output className="text-sm text-muted">{message?.kind === "status" && message.text}</output>
      {message?.kind === "error" && (
        <p role="alert" className="text-sm whitespace-pre-line text-danger">
          {message.text}
        </p>
      )}
    </div>
  )
}
