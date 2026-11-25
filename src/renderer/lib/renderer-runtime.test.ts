import type { Effect } from "effect"
import type { ContextType } from "react"
import { describe, expectTypeOf, it } from "vitest"
import type { RendererRuntimeContext, RendererServices, rendererRuntime } from "./renderer-runtime"

type ForkedContextEffect = Parameters<ContextType<typeof RendererRuntimeContext>["runFork"]>[0]
type ForkedRendererEffect = Parameters<typeof rendererRuntime.runFork>[0]

describe("renderer runtime runFork", () => {
  // Keeps RendererRuntimeContext and rendererRuntime from being widened back
  // to a raw ManagedRuntime whose runFork drops unhandled typed errors.
  it("rejects effects with unhandled typed errors", () => {
    expectTypeOf<Effect.Effect<void, Error>>().not.toExtend<ForkedContextEffect>()
    expectTypeOf<Effect.Effect<void, Error>>().not.toExtend<ForkedRendererEffect>()
    expectTypeOf<Effect.Effect<void, never, RendererServices>>().toExtend<ForkedContextEffect>()
    expectTypeOf<Effect.Effect<void, never, RendererServices>>().toExtend<ForkedRendererEffect>()
  })
})
