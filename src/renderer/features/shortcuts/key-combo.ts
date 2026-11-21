// A key and the modifiers held with it. The primary modifier is Cmd on macOS
// and Ctrl elsewhere, as each platform's own apps use them.
export interface KeyCombo {
  readonly key: string
  readonly primary?: boolean
  readonly alt?: boolean
  readonly shift?: boolean
}

const isLetter = (key: string) => /^[a-z]$/i.test(key)

const isSymbol = (key: string) => key.length === 1 && key !== " " && !isLetter(key)

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
// Shift+/ on a US layout), so Shift only counts for letters, Space, and named
// keys.
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
  Delete: "Delete",
}

const macKeyNames: Partial<Record<string, string>> = {
  Backspace: "Delete",
}

const keyName = (key: string, isMac: boolean) =>
  (isMac ? macKeyNames[key] : undefined) ?? keyNames[key] ?? key.toUpperCase()

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
  labels.push(keyName(combo.key, isMac))
  return labels
}

const ariaKeyName = (key: string) => {
  if (key === " ") {
    return "Space"
  }
  return isLetter(key) ? key.toUpperCase() : key
}

// The aria-keyshortcuts spelling, which names keys by their KeyboardEvent.key
// values, so screen readers can announce the shortcut.
export const ariaKeyShortcut = (combo: KeyCombo, isMac: boolean) => {
  const keys: Array<string> = []
  if (combo.primary === true) {
    keys.push(isMac ? "Meta" : "Control")
  }
  if (combo.alt === true) {
    keys.push("Alt")
  }
  if (combo.shift === true) {
    keys.push("Shift")
  }
  keys.push(ariaKeyName(combo.key))
  return keys.join("+")
}
