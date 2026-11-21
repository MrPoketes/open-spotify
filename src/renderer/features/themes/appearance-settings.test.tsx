import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Option } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { builtInThemes } from "../../../shared/built-in-themes"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import type { ImportThemeReply } from "../../../shared/theme-file-replies"
import { type LibraryTheme, findLibraryTheme, themeLibrary } from "../../../shared/theme-library"
import { readImportedThemes, readSavedSetting } from "../../lib/desktop-bridge-fakes"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
import { renderScreen } from "../../lib/render-screen"
import { IsMacContext } from "../shortcuts/is-mac-context"
import { AppearanceSettings } from "./appearance-settings"
import { appliedToken } from "./applied-theme-token"

const builtInLibrary = {
  themes: themeLibrary([]),
  savedTheme: findLibraryTheme(themeLibrary([]), "dark"),
}

const sunset = {
  id: "0b7f3c2e-9a41-4d6e-8f5b-2c7d1e9a3b60",
  theme: { ...builtInThemes.dark, name: "Sunset", author: "A theme author" },
}

const renderWithImportReply = async (importThemeReply: typeof ImportThemeReply.Encoded) => {
  await renderScreen(
    <AppearanceSettings library={builtInLibrary} />,
    fakeMainProcess({ importThemeReply }),
  )
  await userEvent.click(await screen.findByRole("button", { name: "Import theme…" }))
}

const renderAndExport = async (mainProcess: DesktopApi) => {
  await renderScreen(<AppearanceSettings library={builtInLibrary} />, mainProcess)
  await userEvent.click(await screen.findByRole("button", { name: "Export current theme…" }))
}

const ember = {
  id: "5e1d9c47-3b2a-4f80-9e6d-7a8b4c2f1d05",
  theme: { ...builtInThemes.light, name: "Ember", author: "A theme author" },
}

const importedThemeNames = async (mainProcess: DesktopApi) => {
  const importedThemes = await readImportedThemes(mainProcess)
  return importedThemes.map((libraryTheme) => libraryTheme.theme.name)
}

// The fake main process starts with the imported themes stored, as after a
// restart.
const renderWithImportedThemes = async (
  savedTheme: LibraryTheme,
  mainProcess = fakeMainProcess({ importedThemes: [sunset, ember] }),
) => {
  await renderScreen(
    <AppearanceSettings library={{ themes: themeLibrary([sunset, ember]), savedTheme }} />,
    mainProcess,
  )
  await screen.findByRole("list", { name: "Theme" })
  return mainProcess
}

const themeOptions = () =>
  within(screen.getByRole("list", { name: "Theme" })).getAllByRole("button", { name: / by / })

describe("AppearanceSettings", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style")
  })

  it("adds an imported theme to the picker and says so", async () => {
    await renderWithImportReply({ _tag: "ThemeImported", importedTheme: sunset })

    expect(
      await screen.findByRole("button", { name: "Sunset by A theme author" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Imported Sunset.")
  })

  // The author has to find the broken line, so the main process's message,
  // which names the token, reaches the screen unchanged.
  it("shows why a theme file was rejected and adds no theme", async () => {
    const message =
      'sunset.json is not a valid theme. Expected no excess property at ["tokens"]["color-acent"]'

    await renderWithImportReply({ _tag: "ThemeImportFailed", message })

    expect(await screen.findByRole("alert")).toHaveTextContent('["tokens"]["color-acent"]')
    expect(themeOptions()).toHaveLength(2)
  })

  it("changes nothing when the user cancels the file dialog", async () => {
    await renderWithImportReply({ _tag: "ThemeImportCanceled" })

    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(themeOptions()).toHaveLength(2)
  })

  it("says where the theme was exported", async () => {
    await renderAndExport(fakeMainProcess({ exportThemeReply: "/home/ada/ember.json" }))

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Exported the theme to /home/ada/ember.json.",
    )
  })

  it("reports a failed export", async () => {
    // Writing the file can fail, for example in a folder the user cannot write to.
    await renderAndExport(mainProcessFailingOn(ipcChannels.exportCurrentTheme, fakeMainProcess()))

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not export the theme.")
  })

  it("deletes an imported theme from the picker and from storage", async () => {
    const mainProcess = await renderWithImportedThemes(sunset)

    await userEvent.click(screen.getByRole("button", { name: "Delete Ember" }))

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ember by A theme author" })).toBeNull(),
    )
    expect(await importedThemeNames(mainProcess)).toEqual(["Sunset"])
  })

  // The database can be locked, for example by a backup tool.
  it("keeps a theme the main process could not delete and says so", async () => {
    await renderWithImportedThemes(
      sunset,
      mainProcessFailingOn(
        ipcChannels.deleteImportedTheme,
        fakeMainProcess({ importedThemes: [sunset, ember] }),
      ),
    )

    await userEvent.click(screen.getByRole("button", { name: "Delete Ember" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete Ember.")
    expect(screen.getByRole("button", { name: "Ember by A theme author" })).toBeInTheDocument()
  })

  it("offers no delete control for the built-in themes", async () => {
    await renderWithImportedThemes(sunset)

    expect(screen.queryByRole("button", { name: /^Delete Open Spotify/ })).toBeNull()
  })

  it("applies and saves the default theme when the chosen theme is deleted", async () => {
    const mainProcess = await renderWithImportedThemes(ember)

    await userEvent.click(screen.getByRole("button", { name: "Delete Ember" }))

    await waitFor(async () => {
      expect(await readSavedSetting(mainProcess, "themeId")).toEqual(Option.some("dark"))
    })
    expect(
      screen.getByRole("button", { name: "Open Spotify Dark by Open Spotify", pressed: true }),
    ).toBeInTheDocument()
    expect(appliedToken("color-accent")).toBe(builtInThemes.dark.tokens["color-accent"])
  })

  // Deleting must not drop keyboard focus to the page, or the user has to
  // tab back into the list to carry on.
  it("deletes the focused theme with the Delete key and focuses the row that takes its place", async () => {
    const mainProcess = await renderWithImportedThemes(sunset)

    await userEvent.tab()
    await userEvent.keyboard("{Delete}")

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ember by A theme author" })).toHaveFocus(),
    )
    expect(themeOptions().map((option) => option.getAttribute("aria-label"))).toEqual([
      "Open Spotify Dark by Open Spotify",
      "Open Spotify Light by Open Spotify",
      "Ember by A theme author",
    ])
    expect(await importedThemeNames(mainProcess)).toEqual(["Ember"])
  })

  // Most Mac keyboards have no forward Delete key.
  it("deletes the focused theme with Backspace on macOS", async () => {
    const mainProcess = fakeMainProcess({ importedThemes: [sunset, ember] })
    await renderScreen(
      <IsMacContext value>
        <AppearanceSettings
          library={{ themes: themeLibrary([sunset, ember]), savedTheme: sunset }}
        />
      </IsMacContext>,
      mainProcess,
    )
    await screen.findByRole("list", { name: "Theme" })

    await userEvent.tab()
    await userEvent.keyboard("{Backspace}")

    await waitFor(async () => expect(await importedThemeNames(mainProcess)).toEqual(["Ember"]))
  })

  // docs/themes.md promises that a new version of the theme in use applies at
  // once and takes the old one's place.
  it("applies a re-imported version of the chosen theme in place of the old one", async () => {
    const newSunset = {
      ...sunset,
      theme: { ...sunset.theme, tokens: { ...sunset.theme.tokens, "radius-medium": "13px" } },
    }
    await renderScreen(
      <AppearanceSettings library={{ themes: themeLibrary([sunset]), savedTheme: sunset }} />,
      fakeMainProcess({ importThemeReply: { _tag: "ThemeImported", importedTheme: newSunset } }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Import theme…" }))

    await screen.findByText("Imported Sunset.", { exact: false })
    expect(appliedToken("radius-medium")).toBe("13px")
    expect(screen.getAllByRole("button", { name: "Sunset by A theme author" })).toHaveLength(1)
  })
})
