import type { SdkErrorEvent } from "./web-playback-sdk"

// Why this computer cannot play: an error the Web Playback SDK reported, or
// the Widevine CDM the SDK needs missing from the main process.
export type ThisComputerFailure = SdkErrorEvent | "widevine_missing"

const failureReasons: Record<ThisComputerFailure, string> = {
  initialization_error: "The Spotify player couldn't start on this computer",
  authentication_error: "Spotify didn't accept your login",
  account_error: "Playing on this computer needs Spotify Premium",
  playback_error: "Spotify couldn't play on this computer",
  widevine_missing: "Protected playback isn't available on this computer",
}

export const describeThisComputerFailure = (failure: ThisComputerFailure) => failureReasons[failure]
