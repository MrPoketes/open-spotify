import type { Effect } from "effect"
import { describe, expectTypeOf, it } from "vitest"
import type { mainRuntime } from "./main-runtime"
import type { Settings } from "./settings"

type ForkedMainEffect = Parameters<typeof mainRuntime.runFork>[0]

describe("mainRuntime.runFork", () => {
  // Keeps mainRuntime from being widened back to a raw ManagedRuntime whose
  // runFork drops unhandled typed errors.
  it("rejects effects with unhandled typed errors", () => {
    expectTypeOf<Effect.Effect<void, Error>>().not.toExtend<ForkedMainEffect>()
    expectTypeOf<Effect.Effect<void, never, Settings>>().toExtend<ForkedMainEffect>()
  })
})
