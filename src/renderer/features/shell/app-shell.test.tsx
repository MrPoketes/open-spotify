import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { rendererRuntime } from "../../lib/renderer-runtime"
import { loadSavedSetting } from "../../lib/saved-setting"
import { ContextPlayButton } from "../playback/context-play-button"
import { NoActiveDevice } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { openQueue, renderAppShell } from "./render-app-shell"

const sidebarDivider = () => screen.getByRole("separator", { name: "Resize sidebar" })
const queueDivider = () => screen.getByRole("separator", { name: "Resize queue" })

// The sidebar sits left of its divider and the queue pane right of its own,
// so `growDirection` is the way the pointer moves to widen the pane.
const resizablePanes = [
  {
    name: "sidebar",
    dividerLabel: "Resize sidebar",
    settingKey: "sidebarWidth",
    minimumWidth: 200,
    maximumWidth: 420,
    defaultWidth: 280,
    growDirection: 1,
    growKey: "{ArrowRight}",
    shrinkKey: "{ArrowLeft}",
    renderWithWidth: (width: number) => renderAppShell({ savedSidebarWidth: width }),
    pane: () => screen.getByRole("navigation", { name: "Library" }),
  },
  {
    name: "queue pane",
    dividerLabel: "Resize queue",
    settingKey: "rightPaneWidth",
    minimumWidth: 280,
    maximumWidth: 400,
    defaultWidth: 320,
    growDirection: -1,
    growKey: "{ArrowLeft}",
    shrinkKey: "{ArrowRight}",
    renderWithWidth: async (width: number) => {
      const view = await renderAppShell({ savedRightPaneWidth: width })
      await openQueue()
      return view
    },
    pane: () => screen.getByRole("complementary", { name: "Queue" }),
  },
] as const

describe.each(resizablePanes)("the $name divider", (resizablePane) => {
  const divider = () => screen.getByRole("separator", { name: resizablePane.dividerLabel })
  const dragDivider = async (distance: number) => {
    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: divider(), coords: { clientX: 500 } },
      { coords: { clientX: 500 + distance * resizablePane.growDirection } },
      { keys: "[/MouseLeft]" },
    ])
  }
  const loadSavedWidth = loadSavedSetting(resizablePane.settingKey, resizablePane.defaultWidth)

  it("resizes the pane to follow the dragged divider", async () => {
    await resizablePane.renderWithWidth(300)

    await dragDivider(50)

    expect(divider()).toHaveAttribute("aria-valuenow", "350")
    expect(resizablePane.pane()).toHaveStyle({ width: "350px" })
  })

  it("keeps the pane between its narrowest and widest width while dragging", async () => {
    await resizablePane.renderWithWidth(300)

    await dragDivider(2000)
    expect(divider()).toHaveAttribute("aria-valuenow", String(resizablePane.maximumWidth))

    await dragDivider(-2000)
    expect(divider()).toHaveAttribute("aria-valuenow", String(resizablePane.minimumWidth))
  })

  it("resizes the pane with the arrow keys, Home, and End", async () => {
    await resizablePane.renderWithWidth(300)

    divider().focus()
    await userEvent.keyboard(resizablePane.growKey)
    expect(divider()).toHaveAttribute("aria-valuenow", "316")

    await userEvent.keyboard(resizablePane.shrinkKey)
    await userEvent.keyboard(resizablePane.shrinkKey)
    expect(divider()).toHaveAttribute("aria-valuenow", "284")

    await userEvent.keyboard("{End}")
    expect(divider()).toHaveAttribute("aria-valuenow", String(resizablePane.maximumWidth))

    await userEvent.keyboard("{Home}")
    expect(divider()).toHaveAttribute("aria-valuenow", String(resizablePane.minimumWidth))
  })

  it("restores the default width when the divider is double-clicked", async () => {
    await resizablePane.renderWithWidth(300)

    await userEvent.dblClick(divider())

    expect(divider()).toHaveAttribute("aria-valuenow", String(resizablePane.defaultWidth))
  })

  it("restores the width the user chose after a restart", async () => {
    const firstLaunch = await resizablePane.renderWithWidth(300)
    await dragDivider(50)
    await waitFor(async () => {
      expect(await rendererRuntime.runPromise(loadSavedWidth)).toBe(350)
    })
    firstLaunch.unmount()

    await resizablePane.renderWithWidth(await rendererRuntime.runPromise(loadSavedWidth))

    expect(divider()).toHaveAttribute("aria-valuenow", "350")
  })
})

describe("AppShell", () => {
  // Alt+Left is the back shortcut on Windows and Linux, so with the divider
  // focused it must navigate without also shrinking the sidebar.
  it("leaves the sidebar width alone when a history shortcut is pressed on the divider", async () => {
    await renderAppShell({ savedSidebarWidth: 280 })

    sidebarDivider().focus()
    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}")

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument()
    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "280")
  })

  it("opens settings from the top bar", async () => {
    await renderAppShell()

    await userEvent.click(screen.getByRole("link", { name: "Settings" }))

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument()
  })

  it("goes forward again after going back", async () => {
    await renderAppShell()

    await userEvent.click(screen.getByRole("button", { name: "Go back" }))
    await screen.findByRole("heading", { name: "Home" })
    await userEvent.click(screen.getByRole("button", { name: "Go forward" }))

    expect(await screen.findByRole("heading", { name: "Album" })).toBeInTheDocument()
  })

  it.each([
    { platform: "win32", shortcut: "{Alt>}{ArrowLeft}{/Alt}" },
    { platform: "darwin", shortcut: "{Meta>}[[{/Meta}" },
  ])("goes back with the $platform shortcut", async ({ platform, shortcut }) => {
    await renderAppShell({ platform })

    await userEvent.keyboard(shortcut)

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument()
  })

  it("opens the queue from the now-playing bar and moves focus into it", async () => {
    await renderAppShell()

    await openQueue()

    const queuePane = screen.getByRole("complementary", { name: "Queue" })
    expect(queuePane).toHaveFocus()
    expect(screen.getByRole("button", { name: "Queue" })).toHaveAttribute("aria-pressed", "true")
  })

  it("keeps the queue's width when the queue is closed and opened again", async () => {
    await renderAppShell({ savedRightPaneWidth: 300 })
    await openQueue()

    queueDivider().focus()
    await userEvent.keyboard("{End}")
    await userEvent.click(screen.getByRole("button", { name: "Close queue" }))
    await openQueue()

    expect(queueDivider()).toHaveAttribute("aria-valuenow", "400")
  })

  // Closing the pane removes the element that had focus, which would drop
  // keyboard users back at the start of the page.
  it("toggles the queue with Alt+Shift+Q and returns focus to the queue button", async () => {
    await renderAppShell()

    await userEvent.keyboard("{Alt>}{Shift>}Q{/Shift}{/Alt}")
    const queuePane = screen.getByRole("complementary", { name: "Queue" })
    expect(queuePane).toHaveFocus()
    await userEvent.keyboard("{Alt>}{Shift>}Q{/Shift}{/Alt}")

    expect(screen.queryByRole("complementary", { name: "Queue" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Queue" })).toHaveFocus()
  })

  // Playback is remote control (decision 0002), so playing from a page with
  // no device to play on must lead to choosing one, not fail silently.
  it("opens the device picker and says why when playing from a page finds no device", async () => {
    await renderAppShell({
      runtime: fakeRendererRuntime({
        mainProcess: window.desktop,
        spotifyApi: spotifyApiFakeWith(() => ({
          getPlaybackState: Effect.succeedNone,
          startPlayback: () => Effect.fail(new NoActiveDevice()),
        })),
      }),
      albumPageContent: (
        <ContextPlayButton contextUri="spotify:album:fake-album-0" contextName="Glass Harbour" />
      ),
    })

    await userEvent.click(screen.getByRole("button", { name: "Play Glass Harbour" }))

    expect(await screen.findByRole("dialog", { name: "Connect to a device" })).toBeInTheDocument()
    expect(
      screen.getByText("No device is playing. Choose a device, then try again."),
    ).toBeInTheDocument()
  })

  it("goes back when the mouse's back button is released", async () => {
    await renderAppShell()

    // user-event's default pointer map has no side buttons.
    const user = userEvent.setup({
      pointerMap: [{ name: "MouseBack", pointerType: "mouse", button: "back" }],
    })
    await user.pointer({ keys: "[MouseBack]", target: document.body })

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument()
  })
})
