import { expect, it } from "vitest"
import { cn } from "./class-names"

// tailwind-merge does not know the theme's radius, shadow, and font names, and
// once kept both classes, so the search field's rounded-full lost to the
// input's rounded-medium.
it("lets a later theme radius, shadow, or font class override an earlier one", () => {
  expect(
    cn("rounded-medium shadow-raised font-body", "rounded-full shadow-none font-display"),
  ).toBe("rounded-full shadow-none font-display")
})
