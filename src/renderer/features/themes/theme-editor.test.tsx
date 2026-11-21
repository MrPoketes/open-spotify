import { fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { builtInThemes } from "../../../shared/built-in-themes"
import { ipcChannels } from "../../../shared/ipc-channels"
import { defaultThemeTokens } from "../../../shared/theme"
import { findLibraryTheme, themeLibrary } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { AppearanceSettings } from "./appearance-settings"

const darkAccent = builtInThemes.dark.tokens["color-accent"]
const newAccent = builtInThemes.light.tokens["color-accent"]
const pickedColor = builtInThemes.light.tokens["color-focus"]

const darkMuted = builtInThemes.dark.tokens["color-muted"]
const darkSurface = builtInThemes.dark.tokens["color-surface"]
const mutedOnSurfaceWarning = /color-muted on color-surface: 1\.0:1, needs 4\.5:1/

const announcedText = () =>
  screen
    .getAllByRole("status")
    .map((liveRegion) => liveRegion.textContent)
    .join("")

const appliedToken = (token: string) =>
  document.documentElement.style.getPropertyValue(`--theme-${token}`)

const renderSettingsWithDarkSaved = (mainProcess: DesktopApi) => {
  const library = themeLibrary([])
  return renderScreen(
    <AppearanceSettings
      library={{ themes: library, savedTheme: findLibraryTheme(library, "dark") }}
    />,
    mainProcess,
  )
}

const openEditor = async (mainProcess: DesktopApi = fakeMainProcess()) => {
  const router = renderSettingsWithDarkSaved(mainProcess)
  await userEvent.click(await screen.findByRole("button", { name: "Edit a copy" }))
  return router
}

const replaceText = async (field: HTMLElement, text: string) => {
  await userEvent.clear(field)
  await userEvent.type(field, text)
}

const saveAs = async (name: string) => {
  await replaceText(screen.getByLabelText("Name"), name)
  await userEvent.click(screen.getByRole("button", { name: "Save theme" }))
}

const refusal = "“Open Spotify Dark” by Open Spotify is a built-in theme."

const refusingToSave = (mainProcess: DesktopApi): DesktopApi => ({
  invoke: (channel, request) =>
    channel === ipcChannels.saveEditedTheme
      ? Promise.resolve({ _tag: "ThemeImportFailed", message: refusal })
      : mainProcess.invoke(channel, request),
})

describe("ThemeEditor", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style")
  })

  // The field list comes from the Theme Schema, so a new token must not be
  // left out of the editor.
  it("has a field labelled with each token of the Theme Schema", async () => {
    await openEditor()

    for (const token of Object.keys(defaultThemeTokens)) {
      expect(screen.getByLabelText(token)).toBeInTheDocument()
    }
  })

  it("starts from a copy of the theme chosen in the picker", async () => {
    renderSettingsWithDarkSaved(fakeMainProcess())
    await userEvent.click(
      await screen.findByRole("button", { name: "Open Spotify Light by Open Spotify" }),
    )

    await userEvent.click(screen.getByRole("button", { name: "Edit a copy" }))

    expect(screen.getByLabelText("Name")).toHaveValue("Open Spotify Light (copy)")
    expect(screen.getByLabelText("color-accent")).toHaveValue(
      builtInThemes.light.tokens["color-accent"],
    )
  })

  it("previews a changed color across the whole app", async () => {
    await openEditor()

    await replaceText(screen.getByLabelText("color-accent"), newAccent)

    expect(appliedToken("color-accent")).toBe(newAccent)
  })

  it("previews a color chosen with the color picker and shows it in the text field", async () => {
    await openEditor()

    fireEvent.input(screen.getByLabelText("color-accent picker"), {
      target: { value: pickedColor },
    })

    expect(appliedToken("color-accent")).toBe(pickedColor)
    expect(screen.getByLabelText("color-accent")).toHaveValue(pickedColor)
  })

  it("previews a size built from its number and unit", async () => {
    await openEditor()

    await replaceText(screen.getByLabelText("radius-medium"), "1.5")
    await userEvent.selectOptions(screen.getByLabelText("radius-medium unit"), "rem")

    expect(appliedToken("radius-medium")).toBe("1.5rem")
  })

  it("previews the light color scheme", async () => {
    await openEditor()

    await userEvent.click(screen.getByRole("radio", { name: "Light" }))

    expect(document.documentElement.style.colorScheme).toBe("light")
  })

  it("flags an invalid value next to its field and keeps it off the app", async () => {
    await openEditor()
    const accentField = screen.getByLabelText("color-accent")

    await replaceText(accentField, "orange")

    expect(accentField).toHaveAttribute("aria-invalid", "true")
    expect(accentField).toHaveAccessibleDescription(/hex color/)
    expect(appliedToken("color-accent")).toBe(darkAccent)
  })

  it("warns next to a text color that falls below its contrast target", async () => {
    await openEditor()
    const mutedField = screen.getByLabelText("color-muted")

    await replaceText(mutedField, darkSurface)

    expect(announcedText()).toMatch(mutedOnSurfaceWarning)
    expect(mutedField).toHaveAccessibleDescription(mutedOnSurfaceWarning)
  })

  it("drops the contrast warning once the pair is readable again", async () => {
    await openEditor()
    const mutedField = screen.getByLabelText("color-muted")
    await replaceText(mutedField, darkSurface)

    await replaceText(mutedField, darkMuted)

    expect(announcedText()).toBe("")
    expect(mutedField).not.toHaveAccessibleDescription()
  })

  it("saves the edited theme under the given name and lists and chooses it", async () => {
    const mainProcess = fakeMainProcess()
    await openEditor(mainProcess)
    await replaceText(screen.getByLabelText("color-accent"), newAccent)

    await saveAs("Lime")

    expect(
      await screen.findByRole("button", { name: "Lime by Open Spotify", pressed: true }),
    ).toBeInTheDocument()
    expect(appliedToken("color-accent")).toBe(newAccent)
    const [storedTheme] = await Effect.runPromise(
      DesktopBridge.make(mainProcess).listImportedThemes,
    )
    expect(storedTheme?.theme.tokens["color-accent"]).toBe(newAccent)
    await waitFor(async () => {
      expect(
        await Effect.runPromise(DesktopBridge.make(mainProcess).getSetting("themeId")),
      ).toEqual(Option.some(storedTheme?.id))
    })
  })

  it("does not save while a field is invalid", async () => {
    const mainProcess = fakeMainProcess()
    await openEditor(mainProcess)
    await userEvent.clear(screen.getByLabelText("spacing"))

    await saveAs("Cramped")

    expect(screen.getByRole("alert")).toHaveTextContent("Fix the flagged fields")
    expect(await Effect.runPromise(DesktopBridge.make(mainProcess).listImportedThemes)).toEqual([])
  })

  // The main process names the problem, such as a built-in theme's name.
  it("shows why the main process refused the theme and stays open", async () => {
    await openEditor(refusingToSave(fakeMainProcess()))

    await saveAs("Open Spotify Dark")

    expect(await screen.findByRole("alert")).toHaveTextContent(refusal)
    expect(screen.getByRole("button", { name: "Save theme" })).toBeInTheDocument()
  })

  it("discards the changes and restores the saved theme on cancel", async () => {
    const mainProcess = fakeMainProcess()
    await openEditor(mainProcess)
    await replaceText(screen.getByLabelText("color-accent"), newAccent)

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(appliedToken("color-accent")).toBe(darkAccent)
    expect(screen.getByRole("button", { name: "Edit a copy" })).toHaveFocus()
    expect(await Effect.runPromise(DesktopBridge.make(mainProcess).listImportedThemes)).toEqual([])
  })

  // A history shortcut can leave the settings page while the editor is open.
  it("restores the saved theme when the page closes during an edit", async () => {
    const router = await openEditor()
    await replaceText(screen.getByLabelText("color-accent"), newAccent)

    await router.navigate({ to: "/login" })

    await waitFor(() => expect(appliedToken("color-accent")).toBe(darkAccent))
  })
})
