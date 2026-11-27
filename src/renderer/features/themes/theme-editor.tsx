import { useId, type FormEvent } from "react"
import type { Theme } from "../../../shared/theme"
import type { LibraryTheme } from "../../../shared/theme-library"
import { Button } from "../../ui/button"
import { creditsLabelClassName } from "../../ui/credits-label-class-name"
import { SegmentedControl, type SegmentedControlOption } from "../../ui/segmented-control"
import { SettingRow } from "../../ui/setting-row"
import { TextField } from "../../ui/text-field"
import { themeTokenGroups } from "./theme-token-fields"
import { TokenInput } from "./theme-token-input"
import { useThemeEditor } from "./use-theme-editor"

const colorSchemes: ReadonlyArray<SegmentedControlOption<Theme["colorScheme"]>> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
]

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
      <h3 id={headingId} className="text-base font-semibold">
        Edit a copy of {savedTheme.name}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {/* The button that opened the editor is gone, so focus would fall to the page. */}
        <TextField label="Name" value={editor.name} onChange={editor.setName} focusOnMount />
        <TextField label="Author" value={editor.author} onChange={editor.setAuthor} />
      </div>
      <SettingRow
        label="Color scheme"
        description="Whether scrollbars and other controls the browser draws itself are dark or light."
      >
        {({ descriptionId }) => (
          <SegmentedControl
            label="Color scheme"
            aria-describedby={descriptionId}
            options={colorSchemes}
            value={editor.colorScheme}
            onChange={editor.setColorScheme}
          />
        )}
      </SettingRow>
      {themeTokenGroups.map((group) => (
        // The fields sit in two columns when the form is wide enough.
        <fieldset key={group.heading} className="@container">
          <legend className={`mb-4 w-full border-b border-border pb-2 ${creditsLabelClassName}`}>
            {group.heading}
          </legend>
          <div className="grid gap-x-6 gap-y-4 @md:grid-cols-2">
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
          </div>
        </fieldset>
      ))}
      {/* The theme has dozens of fields, so its buttons stay in reach at the
          bottom of the view while the form scrolls. Sticking stops at the main
          view's content box, so the offset reaches down through its pb-12 to
          the sheet's edge, where nothing scrolls past underneath. */}
      <div className="sticky -bottom-12 flex flex-col gap-3 border-t border-border bg-surface py-4">
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
      </div>
    </form>
  )
}
