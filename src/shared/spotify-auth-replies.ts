import { Schema } from "effect"

export class ClientIdMissing extends Schema.TaggedError<ClientIdMissing>()("ClientIdMissing", {}) {}

export class LoginPortInUse extends Schema.TaggedError<LoginPortInUse>()("LoginPortInUse", {}) {}

export class LoginDenied extends Schema.TaggedError<LoginDenied>()("LoginDenied", {}) {}

// The callback did not carry the state this login sent, so another page may
// have forged it.
export class LoginStateMismatch extends Schema.TaggedError<LoginStateMismatch>()(
  "LoginStateMismatch",
  {},
) {}

// Spotify never calls back when the redirect URI registered in the user's
// Spotify app is wrong: it shows its own error page instead. A timeout is how
// that mistake reaches the app.
export class LoginTimedOut extends Schema.TaggedError<LoginTimedOut>()("LoginTimedOut", {}) {}

export class LoginFailed extends Schema.TaggedError<LoginFailed>()("LoginFailed", {
  message: Schema.String,
}) {}

export const LogInError = Schema.Union([
  ClientIdMissing,
  LoginPortInUse,
  LoginDenied,
  LoginStateMismatch,
  LoginTimedOut,
  LoginFailed,
])

export type LogInError = typeof LogInError.Type

// IPC replies are structured-cloned, and a rejected invoke loses its error
// type, so login errors travel inside the reply.
export const LogInReply = Schema.Union([Schema.TaggedStruct("LoggedIn", {}), LogInError])

export class NotLoggedIn extends Schema.TaggedError<NotLoggedIn>()("NotLoggedIn", {}) {}

// Spotify refused the refresh token, so the user has to log in again.
export class SessionExpired extends Schema.TaggedError<SessionExpired>()("SessionExpired", {}) {}

// The session is kept, because the cause may pass: Spotify was unreachable,
// or the stored session could not be read.
export class AccessTokenUnavailable extends Schema.TaggedError<AccessTokenUnavailable>()(
  "AccessTokenUnavailable",
  { message: Schema.String },
) {}

export const AccessTokenError = Schema.Union([NotLoggedIn, SessionExpired, AccessTokenUnavailable])

export type AccessTokenError = typeof AccessTokenError.Type

export const AccessTokenReply = Schema.Union([
  Schema.TaggedStruct("AccessToken", { accessToken: Schema.String }),
  AccessTokenError,
])
