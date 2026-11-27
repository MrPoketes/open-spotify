import path from "node:path"
import { _electron, test } from "@playwright/test"
import { builtInThemes } from "../src/shared/built-in-themes"
import { serveFakeCoverArt } from "./fake-cover-art"
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
test("takes a screenshot of Home in every built-in theme", async () => {
  const electronApp = await _electron.launch({
    executablePath: packagedAppExecutable(),
    args: [`--user-data-dir=${test.info().outputPath("user-data")}`],
  })
  const appWindow = await electronApp.firstWindow()
  // Wide enough for Home's two-column layout.
  await electronApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setSize(1440, 900),
  )
  await serveFakeWebApi(electronApp.context())
  await serveFakeWebPlaybackSdk(electronApp.context())
  await serveFakeCoverArt(electronApp.context())
  await fakeSpotifyAccounts(electronApp)
  await logInThroughOnboarding(appWindow)

  for (const [themeId, theme] of Object.entries(builtInThemes)) {
    await appWindow.getByRole("link", { name: "Settings" }).click()
    await appWindow.getByRole("button", { name: `${theme.name} by ${theme.author}` }).click()
    await appWindow.getByRole("link", { name: "Home" }).click()
    // A pointer left resting on Home would show its hover state.
    await appWindow.mouse.move(0, 0)
    await appWindow.getByRole("table", { name: "Your top tracks" }).waitFor()
    await appWindow.getByText("Playing on Mira's Laptop").waitFor()
    // Covers below the fold load lazily, so only the ones on screen are awaited.
    await appWindow.waitForFunction(() =>
      [...document.images]
        .filter((image) => image.getBoundingClientRect().top < window.innerHeight)
        .every((image) => image.complete),
    )
    await appWindow.screenshot({ path: path.join(imagesDirectory, `main-view-${themeId}.png`) })
  }

  await electronApp.close()
})
