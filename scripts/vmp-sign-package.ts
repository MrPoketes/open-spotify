import * as NodeServices from "@effect/platform-node/NodeServices"
import { Effect, Schema } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import type { AfterPackContext } from "electron-builder"

class VmpSigningError extends Schema.TaggedError<VmpSigningError>()("VmpSigningError", {
  cause: Schema.Defect(),
}) {}

// Gives the packaged app a production VMP signature through castlabs EVS, so
// Widevine licence servers that check it accept this computer (decision 0007).
// electron-builder runs this hook only when the release workflow passes it,
// and it does so after packaging but before macOS code signing, the order
// castlabs requires on macOS.
const signPackage = Effect.fn("signPackage")(function* (packageDirectory: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  yield* spawner
    .exitCode(
      ChildProcess.make(
        "python",
        ["-m", "castlabs_evs.vmp", "--no-ask", "sign-pkg", packageDirectory],
        { stdout: "inherit", stderr: "inherit" },
      ),
    )
    .pipe(
      Effect.mapError((cause) => new VmpSigningError({ cause })),
      Effect.filterOrFail(
        (exitCode) => exitCode === ChildProcessSpawner.ExitCode(0),
        (exitCode) => new VmpSigningError({ cause: `castlabs EVS exited with code ${exitCode}` }),
      ),
    )
})

export const afterPack = (context: AfterPackContext) =>
  Effect.runPromise(signPackage(context.appOutDir).pipe(Effect.provide(NodeServices.layer)))
