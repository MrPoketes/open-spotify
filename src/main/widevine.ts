import { Duration, Effect, Schema } from "effect"
import { components } from "electron"

class WidevineInstallError extends Schema.TaggedError<WidevineInstallError>()(
  "WidevineInstallError",
  { cause: Schema.Defect() },
) {}

// The castlabs Electron build downloads the Widevine CDM from Google on first
// launch and updates it later. Offline, that download could keep the window
// closed indefinitely, so the app stops waiting and opens without it.
const installTimeout = Duration.seconds(30)

// Remote control through Spotify Connect needs no Widevine, so a failure here
// only rules out playing on this computer and must not stop the app.
export const installWidevine = Effect.tryPromise({
  try: () => components.whenReady([components.WIDEVINE_CDM_ID]),
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
