import { expect, it } from "vitest"
import appCss from "./app.css?raw"
import tokensCss from "./tokens.css?raw"

const declaredTokens = new Set(tokensCss.match(/--theme-[a-z-]+(?=:)/g))
const tokensUsedByStyles = new Set(appCss.match(/(?<=var\()--theme-[a-z-]+(?=\))/g))

// An unused token would let a theme author set a value that changes nothing on
// screen; a used but undeclared token would render as an empty value.
it("uses every declared design token and only declared ones", () => {
  // Guards against the stylesheets loading as empty strings, which would make
  // the comparison below pass without checking anything.
  expect(declaredTokens.size).toBeGreaterThan(0)
  expect(tokensUsedByStyles).toEqual(declaredTokens)
})
