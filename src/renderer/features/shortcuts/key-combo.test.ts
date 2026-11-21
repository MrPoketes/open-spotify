import { describe, expect, it } from "vitest"
import { matchesKeyCombo } from "./key-combo"

const pin = { key: "p" }
const toggleQueue = { key: "q", alt: true, shift: true }

describe("matchesKeyCombo", () => {
  it("matches a letter by the character the layout types", () => {
    // On Dvorak, the key labelled P sits where QWERTY has R.
    const dvorakP = new KeyboardEvent("keydown", { key: "p", code: "KeyR" })
    const dvorakL = new KeyboardEvent("keydown", { key: "l", code: "KeyP" })

    expect(matchesKeyCombo(dvorakP, pin, false)).toBe(true)
    expect(matchesKeyCombo(dvorakL, pin, false)).toBe(false)
  })

  it("matches a letter by key position on a layout without Latin letters", () => {
    const cyrillicKeyP = new KeyboardEvent("keydown", { key: "з", code: "KeyP" })

    expect(matchesKeyCombo(cyrillicKeyP, pin, false)).toBe(true)
  })

  it("matches Option+Shift+letter on macOS, which types a symbol", () => {
    const optionShiftQ = new KeyboardEvent("keydown", {
      key: "Œ",
      code: "KeyQ",
      altKey: true,
      shiftKey: true,
    })

    expect(matchesKeyCombo(optionShiftQ, toggleQueue, true)).toBe(true)
  })
})
