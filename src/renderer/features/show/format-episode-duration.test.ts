import { describe, expect, it } from "vitest"
import { formatEpisodeDuration } from "./format-episode-duration"

describe("formatEpisodeDuration", () => {
  it.each([
    [2_412_000, "40 min"],
    [3_600_000, "1 hr"],
    [3_900_000, "1 hr 5 min"],
    [20_000, "1 min"],
  ])("formats %i ms as %s", (durationMs, label) => {
    expect(formatEpisodeDuration(durationMs)).toBe(label)
  })
})
