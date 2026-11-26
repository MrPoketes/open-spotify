import { Schema } from "effect"

export const SpotifyAccessDenial = Schema.Literals(["userNotRegistered", "premiumRequired"])

type SpotifyAccessDenial = typeof SpotifyAccessDenial.Type

const unregisteredUserPattern =
  /not be registered|not registered|developer dashboard|developer\.spotify\.com\/dashboard/i

const premiumRequiredPattern = /\bpremium\b/i

export const classifyForbidden = (
  message: string,
  reason: string | undefined,
): SpotifyAccessDenial | null => {
  if (reason === "PREMIUM_REQUIRED" || premiumRequiredPattern.test(message)) {
    return "premiumRequired"
  }
  if (unregisteredUserPattern.test(message)) {
    return "userNotRegistered"
  }
  return null
}
