import { Effect, Option, Schema } from "effect"
import { use, useEffect, useState } from "react"
import { Theme, type ThemeToken } from "../../../shared/theme"
import { findContrastShortfalls } from "../../../shared/theme-contrast"
import type { LibraryTheme } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { applyTheme } from "./apply-theme"
import { selectTheme } from "./saved-theme"
import { tokenValueProblem } from "./theme-token-fields"

// A theme with the same name and author is replaced only if the user
// confirms, so declining leaves the editor open with nothing to report.
const saveAndChoose = Effect.fn("saveAndChoose")(
  function* (editedTheme: Theme, onSave: (libraryTheme: LibraryTheme) => void) {
    const bridge = yield* DesktopBridge
    const savedTheme = yield* bridge.saveEditedTheme(editedTheme)
    if (Option.isNone(savedTheme)) {
      return null
    }
    yield* selectTheme(savedTheme.value)
    yield* Effect.sync(() => onSave(savedTheme.value))
    return null
  },
  Effect.catchTag("ThemeImportFailed", (error) => Effect.succeed(error.message)),
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not save the edited theme", error).pipe(
      Effect.as("Could not save the theme."),
    ),
  ),
)

// The editor starts from a copy of the saved theme. Every valid change
// previews across the app at once; an invalid one keeps the last valid value
// applied. Contrast is checked on the applied colors, the ones the user sees.
// Leaving the editor without saving restores the saved theme.
export function useThemeEditor(savedTheme: Theme, onSave: (libraryTheme: LibraryTheme) => void) {
  const runtime = use(RendererRuntimeContext)
  const [name, setName] = useState(`${savedTheme.name} (copy)`)
  const [author, setAuthor] = useState(savedTheme.author)
  const [colorScheme, setColorScheme] = useState(savedTheme.colorScheme)
  const [tokenValues, setTokenValues] = useState<Record<ThemeToken, string>>(savedTheme.tokens)
  const [previewedTokens, setPreviewedTokens] = useState(savedTheme.tokens)
  const [saveProblem, setSaveProblem] = useState<string | null>(null)

  useEffect(() => {
    applyTheme({ ...savedTheme, colorScheme, tokens: previewedTokens })
    return () => applyTheme(savedTheme)
  }, [savedTheme, colorScheme, previewedTokens])

  const setTokenValue = (token: ThemeToken, value: string) => {
    setTokenValues((values) => ({ ...values, [token]: value }))
    if (Option.isNone(tokenValueProblem(token, value))) {
      setPreviewedTokens((tokens) => ({ ...tokens, [token]: value }))
    }
  }

  const save = () => {
    const editedTheme = {
      name: name.trim(),
      author: author.trim(),
      version: "1.0.0",
      colorScheme,
      tokens: tokenValues,
    }
    if (!Schema.is(Theme)(editedTheme)) {
      setSaveProblem("Fix the flagged fields and give the theme a name and author.")
      return
    }
    setSaveProblem(null)
    runtime.runFork(
      saveAndChoose(editedTheme, onSave).pipe(
        Effect.tap((problem) =>
          problem === null ? Effect.void : Effect.sync(() => setSaveProblem(problem)),
        ),
      ),
    )
  }

  return {
    name,
    setName,
    author,
    setAuthor,
    colorScheme,
    setColorScheme,
    tokenValues,
    setTokenValue,
    contrastShortfalls: findContrastShortfalls(previewedTokens),
    saveProblem,
    save,
  }
}
