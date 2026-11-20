import { expect, it } from "vitest"
import { defaultThemeTokens } from "../../shared/theme"
import appCss from "./app.css?raw"

const themeTokens = new Set(Object.keys(defaultThemeTokens).map((token) => `--theme-${token}`))
const tokensUsedByStyles = new Set(appCss.match(/(?<=var\()--theme-[a-z-]+(?=\))/g))

// An unused token would let a theme author set a value that changes nothing on
// screen; a used but undeclared token would render as an empty value.
it("uses every theme token and only theme tokens", () => {
  // Guards against the stylesheet loading as an empty string, which would make
  // the comparison below pass without checking anything.
  expect(tokensUsedByStyles.size).toBeGreaterThan(0)
  expect(tokensUsedByStyles).toEqual(themeTokens)
})
