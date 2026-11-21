import { type FormEvent, useEffect, useId, useRef } from "react"
import type { Theme } from "../../../shared/theme"
import type { LibraryTheme } from "../../../shared/theme-library"
import { AccentButton, SecondaryButton } from "../../ui/pill-button"
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
        <TextField label="Name" value={editor.name} onChange={editor.setName} focusOnMount />
        <TextField label="Author" value={editor.author} onChange={editor.setAuthor} />
      </div>
      <fieldset className="flex gap-4 text-sm">
        <legend className={legendStyle}>Color scheme</legend>
        {colorSchemes.map(({ colorScheme, label }) => (
          <label key={colorScheme} className="flex items-center gap-2">
            <input
              type="radio"
              name="colorScheme"
              checked={editor.colorScheme === colorScheme}
              onChange={() => editor.setColorScheme(colorScheme)}
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
        <AccentButton type="submit" label="Save theme" />
        <SecondaryButton label="Cancel" onClick={onCancel} />
      </div>
    </form>
  )
}

interface TextFieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly focusOnMount?: boolean
}

function TextField({ label, value, onChange, focusOnMount = false }: TextFieldProps) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)

  // The button that opened the editor is gone, so focus would fall to the page.
  useEffect(() => {
    if (focusOnMount) {
      input.current?.focus()
    }
  }, [focusOnMount])

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input
        ref={input}
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-small bg-surface-raised px-3 py-2 text-sm"
      />
    </div>
  )
}
