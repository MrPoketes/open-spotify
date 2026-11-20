import { assert, describe, it } from "@effect/vitest"
import { decideNavigation } from "./navigation-decision"

const productionAppUrl = "app://renderer/"
const devServerAppUrl = "http://localhost:5173"

describe("decideNavigation", () => {
  it("keeps routes of the packaged app in the window", () => {
    assert.strictEqual(decideNavigation("app://renderer/library", productionAppUrl), "in-app")
  })

  it("keeps routes of the dev server in the window", () => {
    assert.strictEqual(decideNavigation("http://localhost:5173/library", devServerAppUrl), "in-app")
  })

  it("sends https links to the system browser", () => {
    const decision = decideNavigation("https://open.spotify.com/artist/1", productionAppUrl)

    assert.strictEqual(decision, "browser")
  })

  // Anything else could reach local files, other apps' protocol handlers, or
  // unencrypted pages, so it is neither loaded in the window nor handed out.
  it.each([
    "app://evil/",
    "http://example.com/",
    "file:///C:/Windows/System32/calc.exe",
    "ms-settings:privacy",
    "not a url",
  ])("blocks %s", (url) => {
    assert.strictEqual(decideNavigation(url, productionAppUrl), "blocked")
  })
})
