import { describe, expect, it } from "vitest"
import { formatCount } from "./format-count"

describe("formatCount", () => {
  it.each([
    { count: 0, expected: "0 tracks" },
    { count: 1, expected: "1 track" },
    { count: 1204, expected: "1,204 tracks" },
  ])("shows $count as $expected", ({ count, expected }) => {
    expect(formatCount(count, "track", "tracks")).toBe(expected)
  })
})
