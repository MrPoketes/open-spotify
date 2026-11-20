import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { descriptiveTestNames } from "./rules/descriptive-test-names.ts"
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
