import type { LibraryTheme } from "../../../shared/theme-library"
import { useThemeFiles } from "./use-theme-files"

const buttonStyle = "rounded-full bg-surface-raised px-4 py-2 text-sm font-semibold"

export function ThemeFileButtons({
  onImport,
}: {
  readonly onImport: (importedTheme: LibraryTheme) => void
}) {
  const { message, importThemeFile, exportCurrentTheme } = useThemeFiles(onImport)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button type="button" onClick={importThemeFile} className={buttonStyle}>
          Import theme…
        </button>
        <button type="button" onClick={exportCurrentTheme} className={buttonStyle}>
          Export current theme…
        </button>
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
