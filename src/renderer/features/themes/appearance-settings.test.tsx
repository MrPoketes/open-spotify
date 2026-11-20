import { screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { builtInThemes } from "../../../shared/built-in-themes"
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
})
