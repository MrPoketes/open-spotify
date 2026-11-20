import path from "node:path"
import {
  type ElectronApplication,
  type Page,
  _electron,
  test as base,
  expect,
} from "@playwright/test"
import { fakeSpotifyAccounts, serveFakeWebApi } from "./fake-spotify"

const appDirectory = path.join(import.meta.dirname, "..")

// The history shortcuts each platform's browsers use (use-history-shortcuts.ts).
const goBackShortcut = process.platform === "darwin" ? "Meta+BracketLeft" : "Alt+ArrowLeft"

const test = base.extend<{ electronApp: ElectronApplication; appWindow: Page }>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from this pattern, and this fixture has none
  electronApp: async ({}, use, testInfo) => {
    // A fresh output folder per test, so every launch starts from an empty profile.
    const userDataDirectory = testInfo.outputPath("user-data")
    const electronApp = await _electron.launch({
      args: [appDirectory, `--user-data-dir=${userDataDirectory}`],
    })
    await use(electronApp)
    await electronApp.close()
  },
  appWindow: async ({ electronApp }, use) => {
    await use(await electronApp.firstWindow())
  },
})

test("opens on the onboarding screen without console errors on an empty profile", async ({
  appWindow,
}) => {
  await expect(appWindow.getByRole("heading", { name: "Connect Open Spotify" })).toBeVisible()
  await expect(appWindow.getByRole("textbox", { name: "Client ID" })).toBeVisible()

  // Read back from the page's history rather than from listeners, which
  // would miss whatever the window logged before the test attached them.
  const consoleErrors = (await appWindow.consoleMessages())
    .filter((message) => message.type() === "error")
    .map((message) => message.text())
  expect(consoleErrors).toEqual([])
  expect(await appWindow.pageErrors()).toEqual([])
})

test("logs in against fake Spotify and moves between pages with the keyboard", async ({
  electronApp,
  appWindow,
}) => {
  await serveFakeWebApi(electronApp.context())
  await fakeSpotifyAccounts(electronApp)

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
})
