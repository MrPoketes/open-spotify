import { describe, expect, it } from "vitest"
import { formatReleaseDate } from "./format-release-date"

describe("formatReleaseDate", () => {
  // Old episodes often only know their year. Reading "2019" as a full date
  // would invent a release day of January 1.
  it("shows only the year when Spotify knows only the year", () => {
    expect(formatReleaseDate({ releaseDate: "2019", releaseDatePrecision: "year" })).toBe("2019")
  })
})
