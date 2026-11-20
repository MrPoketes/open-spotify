import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext, rendererRuntime } from "../../lib/renderer-runtime"
import { AppShell } from "./app-shell"
import { loadSavedSidebarWidth } from "./saved-sidebar-width"

Object.defineProperty(window, "desktop", { value: fakeMainProcess() })

// The sidebar and the now-playing bar must load from the fake Spotify API,
// and the sidebar width must be saved where rendererRuntime reads it back.
const runtimeWithFakeSpotify = fakeRendererRuntime({ mainProcess: window.desktop })

interface ShellOptions {
  readonly savedSidebarWidth?: number
  readonly platform?: string
}

// Starts on a second page so there is a page to go back to.
const renderAppShell = async ({
  savedSidebarWidth = 280,
  platform = "win32",
}: ShellOptions = {}) => {
  const rootRoute = createRootRoute({
    component: () => (
      <AppShell savedSidebarWidth={savedSidebarWidth} platform={platform}>
        <Outlet />
      </AppShell>
    ),
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <h1>Home</h1>,
  })
  const albumRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/album",
    component: () => <h1>Album</h1>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, albumRoute]),
    history: createMemoryHistory({ initialEntries: ["/", "/album"], initialIndex: 1 }),
  })
  const view = render(
    <RendererRuntimeContext value={runtimeWithFakeSpotify}>
      <RouterProvider router={router} />
    </RendererRuntimeContext>,
  )
  await screen.findByRole("heading", { name: "Album" })
  return view
}

const sidebarDivider = () => screen.getByRole("separator", { name: "Resize sidebar" })

const dragDivider = async (fromX: number, toX: number) => {
  await userEvent.pointer([
    { keys: "[MouseLeft>]", target: sidebarDivider(), coords: { clientX: fromX } },
    { coords: { clientX: toX } },
    { keys: "[/MouseLeft]" },
  ])
}

describe("AppShell", () => {
  it("resizes the sidebar to follow the dragged divider", async () => {
    await renderAppShell({ savedSidebarWidth: 280 })

    await dragDivider(280, 330)

    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "330")
    expect(screen.getByRole("navigation", { name: "Library" })).toHaveStyle({ width: "330px" })
  })

  it("keeps the sidebar between 200 and 420 pixels wide", async () => {
    await renderAppShell({ savedSidebarWidth: 280 })

    await dragDivider(280, 2000)
    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "420")

    await dragDivider(420, -2000)
    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "200")
  })

  it("resizes the sidebar with the keyboard", async () => {
    await renderAppShell({ savedSidebarWidth: 280 })

    sidebarDivider().focus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "264")

    await userEvent.keyboard("{End}")
    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "420")

    await userEvent.keyboard("{Home}")
    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "200")
  })

  // Alt+Left is the back shortcut on Windows and Linux, so with the divider
  // focused it must navigate without also shrinking the sidebar.
  it("leaves the sidebar width alone when a history shortcut is pressed on the divider", async () => {
    await renderAppShell({ savedSidebarWidth: 280 })

    sidebarDivider().focus()
    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}")

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument()
    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "280")
  })

  it("resets the sidebar width when the divider is double-clicked", async () => {
    await renderAppShell({ savedSidebarWidth: 400 })

    await userEvent.dblClick(sidebarDivider())

    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "280")
  })

  it("restores the sidebar width the user chose after a restart", async () => {
    const firstLaunch = await renderAppShell({ savedSidebarWidth: 280 })
    await dragDivider(280, 350)
    await waitFor(async () => {
      expect(await rendererRuntime.runPromise(loadSavedSidebarWidth)).toBe(350)
    })
    firstLaunch.unmount()

    const savedSidebarWidth = await rendererRuntime.runPromise(loadSavedSidebarWidth)
    await renderAppShell({ savedSidebarWidth })

    expect(sidebarDivider()).toHaveAttribute("aria-valuenow", "350")
  })

  it("goes back when the back button is pressed", async () => {
    await renderAppShell()

    await userEvent.click(screen.getByRole("button", { name: "Go back" }))

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument()
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
