import { screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { builtInThemes } from "../../../shared/built-in-themes"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import type { ImportThemeReply } from "../../../shared/theme-file-replies"
import { findLibraryTheme, themeLibrary } from "../../../shared/theme-library"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { AppearanceSettings } from "./appearance-settings"

const builtInLibrary = {
  themes: themeLibrary([]),
  savedTheme: findLibraryTheme(themeLibrary([]), "dark"),
}

const sunset = {
  id: "0b7f3c2e-sunset",
  theme: { ...builtInThemes.dark, name: "Sunset", author: "A theme author" },
}

const renderWithImportReply = async (importThemeReply: typeof ImportThemeReply.Encoded) => {
  renderScreen(
    <AppearanceSettings library={builtInLibrary} />,
    fakeMainProcess({ importThemeReply }),
  )
  await userEvent.click(await screen.findByRole("button", { name: "Import theme…" }))
}

// Writing the file can fail, for example in a folder the user cannot write to.
const exportFailing = (mainProcess: DesktopApi): DesktopApi => ({
  invoke: (channel, request) =>
    channel === ipcChannels.exportCurrentTheme
      ? Promise.reject(new Error("EACCES: permission denied"))
      : mainProcess.invoke(channel, request),
})

const renderAndExport = async (mainProcess: DesktopApi) => {
  renderScreen(<AppearanceSettings library={builtInLibrary} />, mainProcess)
  await userEvent.click(await screen.findByRole("button", { name: "Export current theme…" }))
}

const themeOptions = () =>
  within(screen.getByRole("list", { name: "Theme" })).getAllByRole("button")

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
    await renderAndExport(exportFailing(fakeMainProcess()))

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not export the theme.")
  })

  // docs/themes.md promises that a new version of the theme in use applies at
  // once and takes the old one's place.
  it("applies a re-imported version of the chosen theme in place of the old one", async () => {
    const newSunset = {
      ...sunset,
      theme: { ...sunset.theme, tokens: { ...sunset.theme.tokens, "radius-medium": "13px" } },
    }
    renderScreen(
      <AppearanceSettings library={{ themes: themeLibrary([sunset]), savedTheme: sunset }} />,
      fakeMainProcess({ importThemeReply: { _tag: "ThemeImported", importedTheme: newSunset } }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Import theme…" }))

    await screen.findByText("Imported Sunset.", { exact: false })
    expect(document.documentElement.style.getPropertyValue("--theme-radius-medium")).toBe("13px")
    expect(screen.getAllByRole("button", { name: "Sunset by A theme author" })).toHaveLength(1)
  })
})
