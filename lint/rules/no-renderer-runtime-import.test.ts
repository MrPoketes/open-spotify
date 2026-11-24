import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noRendererRuntimeImport } from "./no-renderer-runtime-import.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run("no-renderer-runtime-import", noRendererRuntimeImport, {
  valid: [
    {
      code: 'import { rendererRuntime } from "../lib/renderer-runtime"',
      filename: "src/renderer/routes/_app.tsx",
    },
    {
      code: 'import { rendererRuntime } from "../../lib/renderer-runtime"',
      filename: "src/renderer/routes/_app/settings.tsx",
    },
    {
      code: 'import { rendererRuntime } from "./lib/renderer-runtime"',
      filename: "src/renderer/client.tsx",
    },
    {
      code: 'import { RendererRuntimeContext, type RendererServices } from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
    },
    {
      code: 'import { rendererRuntime } from "./other-module"',
      filename: "src/renderer/features/login/login-screen.tsx",
    },
    {
      code: 'import { fakeRendererRuntime } from "./fake-renderer-runtime"',
      filename: "src/renderer/lib/render-screen.tsx",
    },
    {
      code: 'import type * as runtime from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
    },
    {
      code: 'import type { rendererRuntime } from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
    },
    {
      code: 'import { type rendererRuntime } from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
    },
    {
      code: 'export type { rendererRuntime } from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
    },
  ],
  invalid: [
    {
      code: 'import { rendererRuntime } from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'import { RendererRuntimeContext, rendererRuntime as rt } from "./renderer-runtime.ts"',
      filename: "src/renderer/lib/render-screen.tsx",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'import { "rendererRuntime" as rt } from "../lib/renderer-runtime"',
      filename: "src/renderer/ui/copy-button.tsx",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'import * as runtime from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'export { rendererRuntime } from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'export * from "../../lib/renderer-runtime"',
      filename: "src/renderer/features/login/login-screen.tsx",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'const runtime = import("../../lib/renderer-runtime")',
      filename: "src/renderer/features/login/login-screen.tsx",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'import { rendererRuntime } from "../src/renderer/lib/renderer-runtime"',
      filename: "e2e/app.test.ts",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
    {
      code: 'import { rendererRuntime } from "./lib/renderer-runtime"',
      filename: "src/renderer/routes-helper.ts",
      errors: [{ messageId: "noRendererRuntimeImport" }],
    },
  ],
})
