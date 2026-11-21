import type { LibraryTheme } from "../../../shared/theme-library"
import { SecondaryButton } from "../../ui/pill-button"
import { useThemeFiles } from "./use-theme-files"

export function ThemeFileButtons({
  onImport,
}: {
  readonly onImport: (importedTheme: LibraryTheme) => void
}) {
  const { message, importThemeFile, exportCurrentTheme } = useThemeFiles(onImport)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <SecondaryButton label="Import theme…" onClick={importThemeFile} />
        <SecondaryButton label="Export current theme…" onClick={exportCurrentTheme} />
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
