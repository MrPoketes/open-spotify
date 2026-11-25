import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { findUnexplainedOverrideDisables } from "./override-disable-reasons.ts"

describe("findUnexplainedOverrideDisables", () => {
  it("reports an override that turns a rule off without a reason comment", () => {
    const source = `export default defineConfig({
  overrides: [
    {
      files: ["*.config.ts"],
      rules: {
        "import/no-default-export": "off",
        "no-console": "allow",
        "no-debugger": 0,
        "max-lines": ["off", { max: 300 }],
        "max-params": ["allow"],
      },
    },
  ],
})`

    expect(findUnexplainedOverrideDisables(source)).toEqual([
      'oxlint.config.ts:6: "import/no-default-export" is turned off without a reason comment',
      'oxlint.config.ts:7: "no-console" is turned off without a reason comment',
      'oxlint.config.ts:8: "no-debugger" is turned off without a reason comment',
      'oxlint.config.ts:9: "max-lines" is turned off without a reason comment',
      'oxlint.config.ts:10: "max-params" is turned off without a reason comment',
    ])
  })

  it("accepts an override whose disabled rules are explained by a comment", () => {
    const source = `export default defineConfig({
  overrides: [
    {
      // Tool config files must use a default export.
      files: ["*.config.ts"],
      rules: { "import/no-default-export": "off" },
    },
    // Route filenames are read by the router plugin.
    {
      files: ["src/renderer/routes/**"],
      rules: { "unicorn/filename-case": "off", "react/only-export-components": "off" },
    },
    {
      files: ["**/*.test.ts"],
      // Test suites use nested describe/it blocks.
      rules: { "max-nested-callbacks": "off" },
    },
    {
      files: ["src/renderer/**"],
      rules: {
        "open-spotify/no-dom-node-access": "error",
        // Component tests render bare controls in jsdom.
        "open-spotify/require-appearance-none": "off",
      },
    },
  ],
})`

    expect(findUnexplainedOverrideDisables(source)).toEqual([])
  })

  it("ignores overrides that only enable rules without disabling any", () => {
    const source = `export default defineConfig({
  overrides: [
    {
      files: ["src/main/**"],
      rules: {
        "no-restricted-imports": ["error", { patterns: [] }],
        "no-console": "warn",
      },
    },
  ],
})`

    expect(findUnexplainedOverrideDisables(source)).toEqual([])
  })

  it("rejects an empty comment and a trailing comment from the previous override", () => {
    const source = `export default defineConfig({
  overrides: [
    {
      //
      files: ["a.ts"],
      rules: { "no-console": "off" },
    }, // Trailing note on the previous override.
    {
      files: ["b.ts"],
      rules: { "max-lines": "off" },
    },
  ],
})`

    expect(findUnexplainedOverrideDisables(source)).toEqual([
      'oxlint.config.ts:6: "no-console" is turned off without a reason comment',
      'oxlint.config.ts:10: "max-lines" is turned off without a reason comment',
    ])
  })

  it("reports an uncommented disabled rule even when a sibling rule has a comment", () => {
    const source = `export default defineConfig({
  overrides: [
    {
      files: ["**/*.test.ts"],
      rules: {
        // Test tables are naturally long.
        "max-lines-per-function": "off",
        "max-nested-callbacks": "off",
      },
    },
  ],
})`

    expect(findUnexplainedOverrideDisables(source)).toEqual([
      'oxlint.config.ts:8: "max-nested-callbacks" is turned off without a reason comment',
    ])
  })

  it("reports a config it cannot parse instead of passing silently", () => {
    expect(findUnexplainedOverrideDisables("export default defineConfig({")).toEqual([
      "oxlint.config.ts: could not parse config",
    ])
    expect(findUnexplainedOverrideDisables("export const config = {}")).toEqual([
      "oxlint.config.ts: expected a default-exported config object",
    ])
    expect(
      findUnexplainedOverrideDisables(
        "export default defineConfig({ overrides: sharedOverrides })",
      ),
    ).toEqual(["oxlint.config.ts: expected overrides to be an array literal"])
    expect(
      findUnexplainedOverrideDisables(
        "export default defineConfig({ overrides: [...sharedOverrides] })",
      ),
    ).toEqual(["oxlint.config.ts:1: expected an override object literal"])
    expect(
      findUnexplainedOverrideDisables(
        "export default defineConfig({ overrides: [{ files: ['a.ts'], rules: sharedRules }] })",
      ),
    ).toEqual(["oxlint.config.ts:1: expected rules to be an object literal"])
    expect(
      findUnexplainedOverrideDisables(
        "export default defineConfig({ overrides: [{ files: ['a.ts'], rules: { ...sharedRules } }] })",
      ),
    ).toEqual(["oxlint.config.ts:1: expected rule entries to be explicit properties"])
  })

  // Turning a rule off in oxlint.config.ts overrides counts as disabling it
  // and requires a written reason (AGENTS.md).
  it("requires a reason comment on every disabled override rule in oxlint.config.ts", () => {
    const source = readFileSync("oxlint.config.ts", "utf8")

    expect(findUnexplainedOverrideDisables(source)).toEqual([])
  })
})
