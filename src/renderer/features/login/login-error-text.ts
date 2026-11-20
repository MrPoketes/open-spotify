import type { LoginCancelled, LogInError } from "../../../shared/spotify-auth-replies"
import { spotifyRedirectPort, spotifyRedirectUri } from "../../../shared/spotify-redirect-uri"
import type { DesktopBridgeError } from "../../lib/desktop-bridge"

type ExplainedError = Exclude<LogInError, LoginCancelled> | DesktopBridgeError

const fixedExplanations: Record<Exclude<ExplainedError["_tag"], "LoginFailed">, string> = {
  ClientIdMissing:
    "No Client ID is saved. Choose Change Client ID and paste the one from your Spotify app.",
  LoginPortInUse: `Another program is using port ${spotifyRedirectPort}, which the login needs. Close that program and try again.`,
  LoginDenied:
    "Spotify did not give Open Spotify access to your account. To use the app, log in and choose Agree.",
  LoginStateMismatch:
    "The reply from your browser did not belong to this login, so it was rejected to keep your account safe. Try again.",
  LoginTimedOut: `Spotify did not finish the login within five minutes. The usual cause is a wrong Redirect URI in your Spotify app: it must be exactly ${spotifyRedirectUri}. Spotify then shows its own error page and never returns to Open Spotify.`,
  DesktopBridgeError: "Open Spotify could not start the login. Try again.",
}

export const loginErrorText = (error: ExplainedError) =>
  error._tag === "LoginFailed" ? error.message : fixedExplanations[error._tag]
