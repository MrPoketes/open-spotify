import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { decodeTheme, defaultThemeTokens } from "./theme"

const themeFile = (tokens: Record<string, string>) => ({
  name: "Sunset",
  author: "A theme author",
  version: "1.0.0",
  colorScheme: "dark",
  tokens,
})

describe("decodeTheme", () => {
  it.effect("decodes a theme file and keeps the tokens it sets", () =>
    Effect.gen(function* () {
      const theme = yield* decodeTheme(
        themeFile({ "color-accent": "#ffaa00", "radius-small": "2px" }),
      )

      assert.strictEqual(theme.name, "Sunset")
      assert.strictEqual(theme.colorScheme, "dark")
      assert.strictEqual(theme.tokens["color-accent"], "#ffaa00")
      assert.strictEqual(theme.tokens["radius-small"], "2px")
    }),
  )

  // A theme written before a token existed must keep working when the app
  // adds one, so absent tokens come from the default theme.
  it.effect("fills every token the file leaves out with the default theme's value", () =>
    Effect.gen(function* () {
      const theme = yield* decodeTheme(themeFile({ "color-accent": "#ffaa00" }))

      assert.deepStrictEqual(theme.tokens, { ...defaultThemeTokens, "color-accent": "#ffaa00" })
    }),
  )

  // Theme authors edit JSON by hand, so the error has to point at the token.
  it.effect("rejects an invalid color with an error that names the token", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(decodeTheme(themeFile({ "color-accent": "orange" })))

      assert.include(error.message, "a hex color")
      assert.include(error.message, '["tokens"]["color-accent"]')
    }),
  )

  // A misspelled token would otherwise be dropped and silently change nothing.
  it.effect("rejects an unknown token with an error that names it", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(decodeTheme(themeFile({ "color-acent": "#ffaa00" })))

      assert.include(error.message, '["tokens"]["color-acent"]')
    }),
  )
})
