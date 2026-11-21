import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { useState } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { builtInThemes } from "../../../shared/built-in-themes"
import { type ThemeId, themeLibrary } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { ThemePicker } from "./theme-picker"

const appliedAccent = () => document.documentElement.style.getPropertyValue("--theme-color-accent")

const darkAccent = builtInThemes.dark.tokens["color-accent"]
const lightAccent = builtInThemes.light.tokens["color-accent"]

const savedThemeId = (mainProcess: DesktopApi) =>
  Effect.runPromise(DesktopBridge.make(mainProcess).getSetting("themeId"))

// The picker's owner keeps the chosen theme, as AppearanceSettings does.
function PickerWithSavedTheme({ initialThemeId }: { readonly initialThemeId: ThemeId }) {
  const [chosenThemeId, setChosenThemeId] = useState(initialThemeId)
  return (
    <ThemePicker
      themes={themeLibrary([])}
      chosenThemeId={chosenThemeId}
      onChoose={setChosenThemeId}
      onDelete={() => {}}
    />
  )
}

const renderPickerWithDarkSaved = async () => {
  const mainProcess = fakeMainProcess()
  renderScreen(
    <>
      <PickerWithSavedTheme initialThemeId="dark" />
      <button type="button">Elsewhere</button>
    </>,
    mainProcess,
  )
  await screen.findByRole("list", { name: "Theme" })
  return mainProcess
}

const lightOption = () => screen.getByRole("button", { name: "Open Spotify Light by Open Spotify" })

describe("ThemePicker", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style")
  })

  it("lists the built-in themes by name and author", async () => {
    await renderPickerWithDarkSaved()

    expect(
      screen.getByRole("button", { name: "Open Spotify Dark by Open Spotify", pressed: true }),
    ).toBeInTheDocument()
    expect(lightOption()).toHaveAttribute("aria-pressed", "false")
  })

  it("applies and saves the theme the user clicks", async () => {
    const mainProcess = await renderPickerWithDarkSaved()

    await userEvent.click(lightOption())
    await userEvent.unhover(lightOption())
    await userEvent.tab()

    expect(lightOption()).toHaveAttribute("aria-pressed", "true")
    expect(appliedAccent()).toBe(lightAccent)
    await waitFor(async () => {
      expect(await savedThemeId(mainProcess)).toEqual(Option.some("light"))
    })
  })

  it("previews a hovered theme and restores the saved one when the pointer leaves", async () => {
    const mainProcess = await renderPickerWithDarkSaved()

    await userEvent.hover(lightOption())
    expect(appliedAccent()).toBe(lightAccent)

    await userEvent.unhover(lightOption())
    expect(appliedAccent()).toBe(darkAccent)
    expect(await savedThemeId(mainProcess)).toEqual(Option.none())
  })

  it("previews with the arrow keys and restores the saved theme when focus leaves", async () => {
    await renderPickerWithDarkSaved()

    await userEvent.tab()
    await userEvent.keyboard("{ArrowDown}")
    expect(lightOption()).toHaveFocus()
    expect(appliedAccent()).toBe(lightAccent)

    await userEvent.tab()
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus()
    expect(appliedAccent()).toBe(darkAccent)
  })

  // A history shortcut can leave the settings page while a theme is hovered,
  // so neither the pointer nor focus ever leaves the picker.
  it("restores the saved theme when the page closes during a preview", async () => {
    const mainProcess = fakeMainProcess()
    const router = renderScreen(<PickerWithSavedTheme initialThemeId="dark" />, mainProcess)

    await userEvent.hover(await screen.findByRole("button", { name: /Open Spotify Light/ }))
    expect(appliedAccent()).toBe(lightAccent)
    await router.navigate({ to: "/login" })

    await waitFor(() =>
      expect(screen.queryByRole("list", { name: "Theme" })).not.toBeInTheDocument(),
    )
    expect(appliedAccent()).toBe(darkAccent)
  })

  it("enters the list on the saved theme when tabbed into", async () => {
    renderScreen(<PickerWithSavedTheme initialThemeId="light" />, fakeMainProcess())
    await screen.findByRole("list", { name: "Theme" })

    await userEvent.tab()

    expect(lightOption()).toHaveFocus()
  })

  it("saves the focused theme when Enter is pressed", async () => {
    const mainProcess = await renderPickerWithDarkSaved()

    await userEvent.tab()
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await userEvent.tab()

    expect(appliedAccent()).toBe(lightAccent)
    await waitFor(async () => {
      expect(await savedThemeId(mainProcess)).toEqual(Option.some("light"))
    })
  })
})
