import { Effect, Semaphore } from "effect"

// Creating a window reads the saved theme before the window exists, so two
// quick clicks on the macOS Dock icon can both find no window open. An ask that
// arrives while another window is still being created is dropped instead of
// opening a second window.
export function openWindowIfNone<E, R>(
  createWindow: Effect.Effect<unknown, E, R>,
  countOpenWindows: () => number,
): Effect.Effect<void, E, R> {
  const creatingWindow = Semaphore.makeUnsafe(1)
  return creatingWindow
    .withPermitsIfAvailable(1)(
      Effect.suspend(() => (countOpenWindows() === 0 ? createWindow : Effect.void)),
    )
    .pipe(Effect.asVoid)
}
