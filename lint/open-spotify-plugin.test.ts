import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { descriptiveTestNames } from "./rules/descriptive-test-names.ts"
import { noHardCodedColors } from "./rules/no-hard-coded-colors.ts"
import { noJunkDrawerModules } from "./rules/no-junk-drawer-modules.ts"
import { noTryCatch } from "./rules/no-try-catch.ts"
import { requireDisableReason } from "./rules/require-disable-reason.ts"

// These rules are the automated half of the no-slop policy. If one stops
// reporting, slop gets merged silently, so each rule is pinned to examples.
RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run("no-junk-drawer-modules", noJunkDrawerModules, {
  valid: [{ code: "export const a = 1", filename: "src/renderer/lib/format-duration.ts" }],
  invalid: [
    { code: "export const a = 1", filename: "src/renderer/lib/utils.ts", errors: 1 },
    { code: "export const a = 1", filename: "src/main/helpers.test.ts", errors: 1 },
  ],
})

ruleTester.run("no-try-catch", noTryCatch, {
  valid: ["Effect.tryPromise(() => fetch(url))"],
  invalid: [{ code: "try { run() } catch { recover() }", errors: 1 }],
})

ruleTester.run("require-disable-reason", requireDisableReason, {
  valid: ["// oxlint-disable-next-line no-console -- the CLI prints to stdout\nconsole.log(1)"],
  invalid: [{ code: "// oxlint-disable-next-line no-console\nconsole.log(1)", errors: 1 }],
})

ruleTester.run("descriptive-test-names", descriptiveTestNames, {
  valid: [
    'it("serves the app shell for client-side routes", run)',
    'it.effect("fails when the reply does not match", run)',
  ],
  invalid: [
    { code: 'it("works", run)', errors: 1 },
    { code: 'test("renders correctly", run)', errors: 1 },
    { code: 'it.effect("should return the user profile", run)', errors: 1 },
  ],
})

ruleTester.run("no-hard-coded-colors", noHardCodedColors, {
  valid: [
    {
      code: '<p className="bg-surface text-foreground hover:bg-accent/80 border-border" />',
      filename: "view.tsx",
    },
    'const classes = "bg-transparent text-current fill-current"',
    'const anchor = "#add-to-folder"',
    'const copyright = "&#169; 2026"',
  ],
  invalid: [
    { code: 'const style = { color: "#fff" }', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const shadow = "0 0 4px #1a2b3c80"', errors: [{ messageId: "colorLiteral" }] },
    { code: "const fill = `rgb(0 0 0 / ${alpha})`", errors: [{ messageId: "colorLiteral" }] },
    { code: 'const color = "hsl(10 20% 30%)"', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const color = "oklch(0.7 0.1 30)"', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const classes = "p-4 bg-[#123456]"', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const classes = "text-[rgb(1_2_3)]"', errors: [{ messageId: "colorLiteral" }] },
    {
      code: '<p className="p-4 bg-zinc-900" />',
      filename: "view.tsx",
      errors: [{ messageId: "paletteClass" }],
    },
    {
      code: "const classes = `${base} hover:text-red-500/50 !border-white`",
      errors: [{ messageId: "paletteClass" }, { messageId: "paletteClass" }],
    },
  ],
})
