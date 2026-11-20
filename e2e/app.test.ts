import path from "node:path"
import {
  type ElectronApplication,
  type Page,
  _electron,
  test as base,
  expect,
} from "@playwright/test"
import { fakeSpotifyAccounts, serveFakeWebApi } from "./fake-spotify"

const releaseDirectory = path.join(import.meta.dirname, "..", "release")

// Where `pnpm package:dir` puts the unpacked app on each OS. Testing the
// packaged app catches what only packaging can break, such as a dependency
// left out of the bundle or a file missing from electron-builder.yml.
function packagedAppExecutable(): string {
  if (process.platform === "win32") {
    return path.join(releaseDirectory, "win-unpacked", "Open Spotify.exe")
  }
  if (process.platform === "darwin") {
    const macFolder = process.arch === "arm64" ? "mac-arm64" : "mac"
    return path.join(
      releaseDirectory,
      macFolder,
      "Open Spotify.app",
      "Contents",
      "MacOS",
      "Open Spotify",
    )
  }
  return path.join(releaseDirectory, "linux-unpacked", "open-spotify")
}

// The history shortcuts each platform's browsers use (use-history-shortcuts.ts).
const goBackShortcut = process.platform === "darwin" ? "Meta+BracketLeft" : "Alt+ArrowLeft"

// The fixtures' cover art lives on a made-up host that the content security
// policy blocks, so every cover logs an error that says nothing about the app.
const fakeCoverHost = "covers.open-spotify.invalid"

// Read back from the page's history rather than from listeners, which would
// miss whatever the window logged before the test attached them.
async function windowErrors(appWindow: Page): Promise<Array<string>> {
  const consoleErrors = (await appWindow.consoleMessages())
    .filter((message) => message.type() === "error" && !message.text().includes(fakeCoverHost))
    .map((message) => message.text())
  const pageErrors = (await appWindow.pageErrors()).map((error) => error.message)
  return [...consoleErrors, ...pageErrors]
}

const test = base.extend<{ electronApp: ElectronApplication; appWindow: Page }>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from this pattern, and this fixture has none
  electronApp: async ({}, provide, testInfo) => {
    // A fresh output folder per test, so every launch starts from an empty profile.
    const userDataDirectory = testInfo.outputPath("user-data")
    const electronApp = await _electron.launch({
      executablePath: packagedAppExecutable(),
      args: [`--user-data-dir=${userDataDirectory}`],
    })
    // Playwright's trace option does not cover Electron windows, so tracing
    // starts here. CI uploads test-results/ when a run fails.
    await electronApp.context().tracing.start({ screenshots: true, snapshots: true })
    await provide(electronApp)
    await electronApp.context().tracing.stop({ path: testInfo.outputPath("trace.zip") })
    await electronApp.close()
  },
  appWindow: async ({ electronApp }, provide) => {
    await provide(await electronApp.firstWindow())
  },
})

test("starts on onboarding, logs in against fake Spotify, and moves between pages with the keyboard", async ({
  electronApp,
  appWindow,
}) => {
  await serveFakeWebApi(electronApp.context())
  await fakeSpotifyAccounts(electronApp)

  await expect(appWindow.getByRole("heading", { name: "Connect Open Spotify" })).toBeVisible()
  await appWindow.getByRole("textbox", { name: "Client ID" }).fill("fake-client-id")
  await appWindow.keyboard.press("Enter")
  await appWindow.getByRole("button", { name: "Log in with Spotify" }).click()

  await expect(appWindow.getByRole("heading", { name: "Open Spotify", exact: true })).toBeVisible()
  await appWindow
    .getByRole("navigation", { name: "Library" })
    .getByRole("link", { name: /Slow Science/ })
    .focus()
  await appWindow.keyboard.press("Enter")
  await expect(appWindow.getByRole("heading", { name: "Slow Science", exact: true })).toBeVisible()

  await appWindow.keyboard.press(goBackShortcut)
  await expect(appWindow.getByRole("heading", { name: "Open Spotify", exact: true })).toBeVisible()
  expect(await windowErrors(appWindow)).toEqual([])
})
