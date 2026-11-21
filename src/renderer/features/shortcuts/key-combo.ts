// A key and the modifiers held with it. The primary modifier is Cmd on macOS
// and Ctrl elsewhere, as each platform's own apps use them.
export interface KeyCombo {
  readonly key: string
  readonly primary?: boolean
  readonly alt?: boolean
  readonly shift?: boolean
}

const isLetter = (key: string) => /^[a-z]$/i.test(key)

const isSymbol = (key: string) => key.length === 1 && !isLetter(key)

// Matched by physical key, because event.key gives a different character on
// a non-Latin layout, such as Cyrillic, and macOS turns Option+letter into a
// symbol.
const isKeyPressed = (event: KeyboardEvent, key: string) =>
  isLetter(key) ? event.code === `Key${key.toUpperCase()}` : event.key === key

const areModifiersHeld = (event: KeyboardEvent, combo: KeyCombo, isMac: boolean) => {
  const primaryKey = isMac ? event.metaKey : event.ctrlKey
  const otherKey = isMac ? event.ctrlKey : event.metaKey
  return (
    primaryKey === (combo.primary ?? false) && !otherKey && event.altKey === (combo.alt ?? false)
  )
}

// Typing a symbol takes Shift on some layouts and not on others (`?` is
// Shift+/ on a US layout), so Shift only counts for letters and named keys.
const isShiftAsRequired = (event: KeyboardEvent, combo: KeyCombo) =>
  isSymbol(combo.key) || event.shiftKey === (combo.shift ?? false)

export const matchesKeyCombo = (event: KeyboardEvent, combo: KeyCombo, isMac: boolean) =>
  isKeyPressed(event, combo.key) &&
  areModifiersHeld(event, combo, isMac) &&
  isShiftAsRequired(event, combo)

const keyNames: Partial<Record<string, string>> = {
  " ": "Space",
  ArrowLeft: "←",
  ArrowRight: "→",
}

// The keys to press, in order, as the platform's keyboards label them.
export const keyComboLabels = (combo: KeyCombo, isMac: boolean): ReadonlyArray<string> => {
  const labels: Array<string> = []
  if (combo.primary === true) {
    labels.push(isMac ? "Cmd" : "Ctrl")
  }
  if (combo.alt === true) {
    labels.push(isMac ? "Option" : "Alt")
  }
  if (combo.shift === true) {
    labels.push("Shift")
  }
  labels.push(keyNames[combo.key] ?? combo.key.toUpperCase())
  return labels
}
