import { Duration, Effect, Schema } from "effect"

class WidevineInstallError extends Schema.TaggedError<WidevineInstallError>()(
  "WidevineInstallError",
  { cause: Schema.Defect() },
) {}

// The castlabs Electron build downloads the Widevine CDM from Google on first
// launch and updates it later. Offline, that download could keep the window
// closed indefinitely, so the app stops waiting and opens without it.
const installTimeout = Duration.seconds(30)

// Takes castlabs' `components.whenReady` as a parameter, so tests can run it
// without Electron. Remote control through Spotify Connect needs no Widevine,
// so a failure here only rules out playing on this computer and never fails.
export const installWidevine = (whenWidevineReady: () => Promise<unknown>) =>
  Effect.tryPromise({
    try: whenWidevineReady,
    catch: (cause) => new WidevineInstallError({ cause }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: installTimeout,
      orElse: () => Effect.fail(new WidevineInstallError({ cause: "Widevine took too long" })),
    }),
    Effect.flatMap((installed) => Effect.logInfo("Widevine is ready", installed)),
    Effect.catch((error) =>
      Effect.logWarning("Widevine did not install, so this computer cannot play audio", error),
    ),
  )
