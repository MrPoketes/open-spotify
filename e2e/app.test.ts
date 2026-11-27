import {
  _electron,
  test as base,
  expect,
  type ElectronApplication,
  type Page,
} from "@playwright/test"
import {
  fakeSpotifyAccounts,
  logInThroughOnboarding,
  serveFakeWebApi,
  serveFakeWebPlaybackSdk,
} from "./fake-spotify"
import { packagedAppExecutable } from "./packaged-app"

// The history shortcuts each platform's browsers use (keyboard-shortcuts.ts).
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
      // The packaged app, because that catches what only packaging can break,
      // such as a dependency left out of the bundle or a file missing from
      // electron-builder.yml.
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
  await serveFakeWebPlaybackSdk(electronApp.context())
  await fakeSpotifyAccounts(electronApp)

  await expect(appWindow.getByRole("heading", { name: "Connect Open Spotify" })).toBeVisible()
  await logInThroughOnboarding(appWindow)

  await appWindow
    .getByRole("navigation", { name: "Library" })
    .getByRole("link", { name: /Slow Science/ })
    .focus()
  await appWindow.keyboard.press("Enter")
  await expect(appWindow.getByRole("heading", { name: "Slow Science", exact: true })).toBeVisible()

  await appWindow.keyboard.press(goBackShortcut)
  await expect(appWindow.getByRole("heading", { name: "Hello, Mira Kaelin" })).toBeVisible()
  expect(await windowErrors(appWindow)).toEqual([])
})

// Playing on this computer needs Widevine, which only the castlabs Electron
// build provides and which the main process installs before the window opens.
test("reports Widevine as available to the page", async ({ appWindow }) => {
  const widevineAccess = await appWindow.evaluate(() =>
    navigator
      .requestMediaKeySystemAccess("com.widevine.alpha", [
        {
          initDataTypes: ["cenc"],
          audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }],
        },
      ])
      .then(
        () => "granted",
        (error: unknown) => String(error),
      ),
  )

  expect(widevineAccess).toBe("granted")
})
