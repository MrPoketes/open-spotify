import { describe, expect, it } from "vitest"
import { formatReleaseDate, formatReleaseDateAttribute } from "./format-release-date"

describe("formatReleaseDate", () => {
  // Old episodes often only know their year. Reading "2019" as a full date
  // would invent a release day of January 1.
  it("shows only the year when Spotify knows only the year", () => {
    expect(formatReleaseDate({ releaseDate: new Date("2019"), releaseDatePrecision: "year" })).toBe(
      "2019",
    )
  })

  it("formats the HTML datetime attribute to the precision Spotify sent", () => {
    const releaseDate = new Date("2026-03-14")

    expect(formatReleaseDateAttribute({ releaseDate, releaseDatePrecision: "year" })).toBe("2026")
    expect(formatReleaseDateAttribute({ releaseDate, releaseDatePrecision: "month" })).toBe(
      "2026-03",
    )
    expect(formatReleaseDateAttribute({ releaseDate, releaseDatePrecision: "day" })).toBe(
      "2026-03-14",
    )
  })
})
