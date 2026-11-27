import { useId, type FormEvent } from "react"
import type { Theme } from "../../../shared/theme"
import type { LibraryTheme } from "../../../shared/theme-library"
import { Button } from "../../ui/button"
import { TextField } from "../../ui/text-field"
import { themeTokenGroups } from "./theme-token-fields"
import { TokenInput } from "./theme-token-input"
import { useThemeEditor } from "./use-theme-editor"

const legendStyle = "mb-3 font-display text-base font-bold"

const colorSchemes = [
  { colorScheme: "dark", label: "Dark" },
  { colorScheme: "light", label: "Light" },
] as const

interface ThemeEditorProps {
  readonly savedTheme: Theme
  readonly onSave: (libraryTheme: LibraryTheme) => void
  readonly onCancel: () => void
}

export function ThemeEditor({ savedTheme, onSave, onCancel }: ThemeEditorProps) {
  const editor = useThemeEditor(savedTheme, onSave)
  const headingId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    editor.save()
  }

  return (
    <form aria-labelledby={headingId} onSubmit={submit} noValidate className="flex flex-col gap-8">
      <h3 id={headingId} className="font-display text-xl font-bold">
        Edit a copy of {savedTheme.name}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {/* The button that opened the editor is gone, so focus would fall to the page. */}
        <TextField label="Name" value={editor.name} onChange={editor.setName} focusOnMount />
        <TextField label="Author" value={editor.author} onChange={editor.setAuthor} />
      </div>
      <fieldset className="flex gap-4 text-sm">
        <legend className={legendStyle}>Color scheme</legend>
        {colorSchemes.map(({ colorScheme, label }) => (
          <label key={colorScheme} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="colorScheme"
              checked={editor.colorScheme === colorScheme}
              onChange={() => editor.setColorScheme(colorScheme)}
              className="grid size-4 shrink-0 cursor-pointer appearance-none place-content-center rounded-full border border-border bg-surface-raised transition-colors duration-120 ease-out before:size-2 before:rounded-full before:bg-on-accent before:opacity-0 checked:border-accent checked:bg-accent checked:before:opacity-100"
            />
            {label}
          </label>
        ))}
      </fieldset>
      {themeTokenGroups.map((group) => (
        <fieldset key={group.heading} className="flex flex-col gap-4">
          <legend className={legendStyle}>{group.heading}</legend>
          {group.fields.map((field) => (
            <TokenInput
              key={field.token}
              field={field}
              value={editor.tokenValues[field.token]}
              contrastShortfalls={editor.contrastShortfalls.filter(
                (shortfall) => shortfall.foreground === field.token,
              )}
              onChange={(value) => editor.setTokenValue(field.token, value)}
            />
          ))}
        </fieldset>
      ))}
      {editor.saveProblem !== null && (
        <p role="alert" className="text-sm text-danger">
          {editor.saveProblem}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit">Save theme</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
