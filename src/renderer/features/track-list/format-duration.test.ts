import { describe, expect, it } from "vitest"
import { formatTotalDuration, formatTrackDuration } from "./format-duration"

describe("formatTrackDuration", () => {
  it.each([
    { durationMs: 5_000, expected: "0:05" },
    { durationMs: 3_599_999, expected: "59:59" },
    { durationMs: 3_600_000, expected: "1:00:00" },
  ])("shows $durationMs ms as $expected", ({ durationMs, expected }) => {
    expect(formatTrackDuration(durationMs)).toBe(expected)
  })
})

describe("formatTotalDuration", () => {
  it.each([
    { durationMs: 59_000, expected: "59 sec" },
    { durationMs: 3_599_000, expected: "59 min" },
    { durationMs: 3_600_000, expected: "1 hr" },
    { durationMs: 3_660_000, expected: "1 hr 1 min" },
  ])("shows $durationMs ms as $expected", ({ durationMs, expected }) => {
    expect(formatTotalDuration(durationMs)).toBe(expected)
  })
})
