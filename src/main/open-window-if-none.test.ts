import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber } from "effect"
import { openWindowIfNone } from "./open-window-if-none"

function makeFakeWindows() {
  const fakeWindows = {
    createdCount: 0,
    openCount: 0,
    createWindow: Effect.sync(() => {
      fakeWindows.createdCount += 1
      fakeWindows.openCount += 1
    }),
    countOpenWindows: () => fakeWindows.openCount,
  }
  return fakeWindows
}

describe("openWindowIfNone", () => {
  // Two quick clicks on the macOS Dock icon both ask for a window before the
  // first one exists.
  it.effect("opens one window when asked again while the first is still being created", () =>
    Effect.gen(function* () {
      const fakeWindows = makeFakeWindows()
      const creationCanFinish = yield* Deferred.make<void>()
      const openWindow = openWindowIfNone(
        Deferred.await(creationCanFinish).pipe(Effect.andThen(fakeWindows.createWindow)),
        fakeWindows.countOpenWindows,
      )

      const firstAsk = yield* Effect.forkChild(openWindow)
      yield* Effect.yieldNow
      const secondAsk = yield* Effect.forkChild(openWindow)
      yield* Effect.yieldNow
      yield* Deferred.succeed(creationCanFinish, undefined)
      yield* Fiber.join(firstAsk)
      yield* Fiber.join(secondAsk)

      assert.strictEqual(fakeWindows.createdCount, 1)
    }),
  )

  it.effect("leaves an open window as the only one", () =>
    Effect.gen(function* () {
      const fakeWindows = makeFakeWindows()
      const openWindow = openWindowIfNone(fakeWindows.createWindow, fakeWindows.countOpenWindows)

      yield* openWindow
      yield* openWindow

      assert.strictEqual(fakeWindows.createdCount, 1)
    }),
  )

  // Clicking the Dock icon after closing the last window must bring a window back.
  it.effect("opens a new window after the last one was closed", () =>
    Effect.gen(function* () {
      const fakeWindows = makeFakeWindows()
      const openWindow = openWindowIfNone(fakeWindows.createWindow, fakeWindows.countOpenWindows)

      yield* openWindow
      fakeWindows.openCount = 0
      yield* openWindow

      assert.strictEqual(fakeWindows.openCount, 1)
    }),
  )
})
