import { assert, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import themeAuthoringGuide from "../../../../docs/themes.md?raw"
import { decodeTheme, defaultThemeTokens } from "../../../shared/theme"

const tokenReference = themeAuthoringGuide
  .split(/^## /m)
  .find((section) => section.startsWith("Token reference"))

const exampleThemeJson = themeAuthoringGuide.match(/```json\n(.+?)```/s)?.[1]

describe("the theme authoring guide", () => {
  // Theme authors rely on the reference to know what they can set: a missing
  // token cannot be discovered, and a listed but unknown one is rejected on import.
  it("lists every theme token and only theme tokens in its token reference", () => {
    // A renamed heading would otherwise read as every token missing.
    assert.isDefined(tokenReference)
    // The first cell of each table row in the reference names one token.
    const tokensInReference = new Set(tokenReference.match(/(?<=^\| `)[a-z-]+(?=`)/gm))

    expect(tokensInReference).toEqual(new Set(Object.keys(defaultThemeTokens)))
  })

  // Authors start by copying the example, so it has to import.
  it.effect("contains an example theme that decodes without errors", () =>
    Effect.gen(function* () {
      assert.isDefined(exampleThemeJson)
      yield* decodeTheme(JSON.parse(exampleThemeJson))
    }),
  )
})
