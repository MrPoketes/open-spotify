import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noSharedFakeMainProcess } from "./no-shared-fake-main-process.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run("no-shared-fake-main-process", noSharedFakeMainProcess, {
  valid: [
    'it("saves", () => { const mainProcess = fakeMainProcess() })',
    'describe("Settings", () => { it("saves", () => { fakeRendererRuntime() }) })',
    "const launchApp = (mainProcess = fakeMainProcess()) => renderAppShell(mainProcess)",
    "function renderTree() { return renderScreen(fakeMainProcess()) }",
    "const runtime = fakeRendererRuntimeLike()",
  ],
  invalid: [
    {
      code: "const mainProcess = fakeMainProcess()",
      errors: [{ messageId: "noSharedFakeMainProcess" }],
    },
    {
      code: 'Object.defineProperty(window, "desktop", { value: fakeMainProcess() })',
      errors: [{ messageId: "noSharedFakeMainProcess" }],
    },
    {
      code: "export const appShellRuntime = appShellRuntimeWith({})",
      errors: [{ messageId: "noSharedFakeMainProcess" }],
    },
    {
      code: 'describe("Settings", () => { const runtime = fakeRendererRuntime() })',
      errors: [{ messageId: "noSharedFakeMainProcess" }],
    },
    {
      code: 'describe.each(panes)("$name", () => { const mainProcess = fakeMainProcess() })',
      errors: [{ messageId: "noSharedFakeMainProcess" }],
    },
    {
      code: 'describe.skip("Settings", () => { const mainProcess = fakeMainProcess() })',
      errors: [{ messageId: "noSharedFakeMainProcess" }],
    },
  ],
})
