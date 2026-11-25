import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noEffectRun } from "./no-effect-run.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const expectedMessage =
  "Run effects through rendererRuntime, mainRuntime, or RendererRuntimeContext instead of calling Effect.run* directly."

ruleTester.run("no-effect-run", noEffectRun, {
  valid: [
    "rendererRuntime.runPromise(loadAppShell)",
    "Effect.gen(function* () { return 1 })",
    "Effect[runner](program)",
    'import { runSync } from "./other-runner"; runSync(program)',
    'import { succeed } from "effect/Effect"',
    { code: 'import type { runPromise } from "effect/Effect"', filename: "module.ts" },
    { code: 'import { type runSync } from "effect/Effect"', filename: "module.ts" },
    {
      code: 'import { type Effect as E } from "effect"; E.runFork(program)',
      filename: "module.ts",
    },
  ],
  invalid: [
    {
      code: "Effect.runSync(program)",
      errors: [{ message: expectedMessage }],
    },
    {
      code: "Effect.runSyncExit(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runSyncWith(context)(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runSyncExitWith(context)(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runPromise(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runPromiseExit(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runPromiseWith(context)(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runPromiseExitWith(context)(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runFork(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runForkWith(context)(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runCallback(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "Effect.runCallbackWith(context)(program)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: 'Effect["runPromise"](program)',
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: "program.pipe(Effect.runSync)",
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: 'import { Effect as E } from "effect"; E.runFork(program)',
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: 'import * as Eff from "effect/Effect"; Eff.runCallback(program)',
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: 'import { runPromise } from "effect/Effect"',
      errors: [{ messageId: "noEffectRun" }],
    },
    {
      code: 'import { "runFork" as fork } from "effect/Effect"',
      errors: [{ messageId: "noEffectRun" }],
    },
  ],
})
