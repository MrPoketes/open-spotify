import * as NodeServices from "@effect/platform-node/NodeServices"
import { Effect, Schema } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import type { AfterPackContext } from "electron-builder"

class VmpSigningError extends Schema.TaggedError<VmpSigningError>()("VmpSigningError", {
  cause: Schema.Defect(),
}) {}

// Gives the packaged app a production VMP signature through castlabs EVS, so
// Widevine licence servers that check it accept this computer (decision 0007).
// electron-builder runs it only when the release workflow passes it as a hook.
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

const signPackageAfterBuild = (context: AfterPackContext) =>
  Effect.runPromise(signPackage(context.appOutDir).pipe(Effect.provide(NodeServices.layer)))

// castlabs requires VMP signing before code signing on macOS and after it on
// Windows. On Windows, electron-builder also rewrites the executable's icon
// and version resources after `afterPack`, which would break the signature,
// so Windows signs in `afterSign`, which runs even without a certificate.
export const afterPack = signPackageAfterBuild
export const afterSign = signPackageAfterBuild
