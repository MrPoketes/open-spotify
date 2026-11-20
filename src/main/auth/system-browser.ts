import { Context, Effect, Layer, Schema } from "effect"

export class BrowserOpenError extends Schema.TaggedError<BrowserOpenError>()("BrowserOpenError", {
  cause: Schema.Defect(),
}) {}

// Takes Electron's shell.openExternal as a parameter so that login can be
// tested with a fake browser in plain Node.
export class SystemBrowser extends Context.Service<
  SystemBrowser,
  { readonly open: (url: string) => Effect.Effect<void, BrowserOpenError> }
>()("open-spotify/SystemBrowser") {
  static readonly layer = (openExternal: (url: string) => Promise<void>) =>
    Layer.succeed(
      SystemBrowser,
      SystemBrowser.of({
        open: (url) =>
          Effect.tryPromise({
            try: () => openExternal(url),
            catch: (cause) => new BrowserOpenError({ cause }),
          }),
      }),
    )
}
