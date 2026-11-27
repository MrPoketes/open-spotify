import path from "node:path"
import { _electron, test } from "@playwright/test"
import { builtInThemes } from "../src/shared/built-in-themes"
import {
  fakeSpotifyAccounts,
  logInThroughOnboarding,
  serveFakeWebApi,
  serveFakeWebPlaybackSdk,
} from "./fake-spotify"
import { packagedAppExecutable } from "./packaged-app"

const imagesDirectory = path.join(import.meta.dirname, "..", "docs", "images")

// Not a test: `pnpm screenshots` runs it to retake the README's screenshots
// from fake data whenever the UI changes.
test("takes a screenshot of the main view in every built-in theme", async () => {
  const electronApp = await _electron.launch({
    executablePath: packagedAppExecutable(),
    args: [`--user-data-dir=${test.info().outputPath("user-data")}`],
  })
  const appWindow = await electronApp.firstWindow()
  await serveFakeWebApi(electronApp.context())
  await serveFakeWebPlaybackSdk(electronApp.context())
  await fakeSpotifyAccounts(electronApp)
  await logInThroughOnboarding(appWindow)

  const library = appWindow.getByRole("navigation", { name: "Library" })
  for (const [themeId, theme] of Object.entries(builtInThemes)) {
    await appWindow.getByRole("link", { name: "Settings" }).click()
    await appWindow.getByRole("button", { name: `${theme.name} by ${theme.author}` }).click()
    await library.getByRole("link", { name: /Late Night Drive/ }).click()
    await appWindow.getByText("Electric Rivers").waitFor()
    await appWindow.getByText("Playing on Mira's Laptop").waitFor()
    await appWindow.screenshot({ path: path.join(imagesDirectory, `main-view-${themeId}.png`) })
  }

  await electronApp.close()
})
